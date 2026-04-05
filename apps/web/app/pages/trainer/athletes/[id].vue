<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const { api } = useApiClient()
const trainerStore = useTrainerStore()
const toast = useToast()

const athleteId = route.params.id as string
const loading = ref(true)
const error = ref('')

// ── Tabs ────────────────────────────────────────
const activeTab = ref('overview')
const tabs = [
  { label: 'Overview', value: 'overview', icon: 'i-lucide-layout-dashboard' },
  { label: 'Workouts', value: 'workouts', icon: 'i-lucide-timer' },
  { label: 'Programs', value: 'programs', icon: 'i-lucide-clipboard-list' },
  { label: 'Records', value: 'records', icon: 'i-lucide-trophy' }
]

// ── Stats ───────────────────────────────────────
interface OverviewStats {
  totalWorkouts: number
  totalVolume: number
  currentStreak: number
  totalExercises: number
  totalPersonalRecords: number
  memberSince: string
}

const stats = ref<OverviewStats | null>(null)

// ── Session history ─────────────────────────────
interface Session {
  id: string
  name: string
  status: string
  startedAt: string
  completedAt: string | null
  sessionExercises: Array<{
    id: string
    exercise: { name: string }
    sets: Array<{ id: string }>
  }>
}

interface PaginatedSessions {
  data: Session[]
  meta: { page: number, limit: number, total: number, totalPages: number }
}

const sessions = ref<Session[]>([])
const sessionsMeta = ref({ page: 1, limit: 10, total: 0, totalPages: 0 })
const sessionsLoading = ref(false)

// ── Records ─────────────────────────────────────
interface PersonalRecord {
  id: string
  exerciseId: string
  exerciseName: string
  prType: string
  value: number
  achievedOn: string
}

interface PaginatedRecords {
  data: PersonalRecord[]
  meta: { page: number, limit: number, total: number, totalPages: number }
}

const records = ref<PersonalRecord[]>([])
const recordsMeta = ref({ page: 1, limit: 20, total: 0, totalPages: 0 })
const recordsLoading = ref(false)

// ── Assignments ─────────────────────────────────
interface Assignment {
  id: string
  status: string
  startDate: string | null
  allowSessionDeviations: boolean
  assignedAt: string
  program: { id: string, name: string, sourceProgramId: string | null }
}

const assignments = ref<Assignment[]>([])
const assignmentsLoading = ref(false)
const assignmentsLoaded = ref(false)
const showAssignModal = ref(false)

// ── Active session ──────────────────────────────
const activeSession = ref<Session | null>(null)

// ── Initial load ────────────────────────────────
onMounted(async () => {
  try {
    const [_profile, statsData, activeData, assignmentsData] = await Promise.all([
      trainerStore.fetchAthleteProfile(athleteId),
      api<OverviewStats>(`/trainer/athletes/${athleteId}/stats`),
      api<Session | null>(`/trainer/athletes/${athleteId}/sessions/active`),
      api<Assignment[]>(`/trainer/athletes/${athleteId}/assignments`)
    ])
    stats.value = statsData
    activeSession.value = activeData
    assignments.value = assignmentsData
    assignmentsLoaded.value = true
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    error.value = fetchError?.data?.message || 'Failed to load athlete data'
  } finally {
    loading.value = false
  }
})

// ── Load tab data on tab change ─────────────────
watch(activeTab, async (tab) => {
  if (tab === 'workouts' && sessions.value.length === 0) {
    await loadSessions()
  }
  if (tab === 'programs' && !assignmentsLoaded.value) {
    await loadAssignments()
  }
  if (tab === 'records' && records.value.length === 0) {
    await loadRecords()
  }
})

async function loadSessions(page = 1) {
  sessionsLoading.value = true
  try {
    const data = await api<PaginatedSessions>(
      `/trainer/athletes/${athleteId}/sessions?page=${page}&limit=10`
    )
    sessions.value = data.data
    sessionsMeta.value = data.meta
  } finally {
    sessionsLoading.value = false
  }
}

async function loadRecords(page = 1) {
  recordsLoading.value = true
  try {
    const data = await api<PaginatedRecords>(
      `/trainer/athletes/${athleteId}/records?page=${page}&limit=20`
    )
    records.value = data.data
    recordsMeta.value = data.meta
  } finally {
    recordsLoading.value = false
  }
}

async function loadAssignments() {
  assignmentsLoading.value = true
  try {
    assignments.value = await api<Assignment[]>(
      `/trainer/athletes/${athleteId}/assignments`
    )
    assignmentsLoaded.value = true
  } finally {
    assignmentsLoading.value = false
  }
}

async function cancelAssignment(assignmentId: string) {
  try {
    await api(`/trainer/assignments/${assignmentId}`, { method: 'DELETE' })
    assignments.value = assignments.value.filter(a => a.id !== assignmentId)
    toast.add({ title: 'Assignment cancelled', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to cancel assignment', color: 'error' })
  }
}

// ── Start workout on behalf ─────────────────────
const showStartModal = ref(false)
const startingSession = ref(false)
const sessionName = ref('')
const selectedAssignmentId = ref<string | null>(null)

const activeAssignments = computed(() =>
  assignments.value.filter(a => a.status === 'ACTIVE')
)

watch(selectedAssignmentId, (id) => {
  if (id) {
    const assignment = assignments.value.find(a => a.id === id)
    if (assignment) sessionName.value = assignment.program.name
  } else {
    sessionName.value = ''
  }
})

watch(showStartModal, (open) => {
  if (open) {
    selectedAssignmentId.value = null
    sessionName.value = ''
  }
})

async function startSession() {
  startingSession.value = true
  try {
    await api(`/trainer/athletes/${athleteId}/sessions/start`, {
      method: 'POST',
      body: {
        name: sessionName.value || undefined,
        programAssignmentId: selectedAssignmentId.value || undefined
      }
    })
    toast.add({ title: 'Workout started for athlete', color: 'success' })
    showStartModal.value = false
    sessionName.value = ''
    selectedAssignmentId.value = null
    router.push(`/trainer/session/${athleteId}`)
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError?.data?.message || 'Failed to start workout',
      color: 'error'
    })
  } finally {
    startingSession.value = false
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatDuration(startedAt: string, completedAt: string | null) {
  if (!completedAt) return 'In progress'
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function formatPRValue(prType: string, value: number) {
  if (prType === 'MAX_WEIGHT' || prType === 'ESTIMATED_1RM') return `${value} kg`
  if (prType === 'MAX_REPS') return `${value} reps`
  if (prType === 'MAX_DURATION') return `${value}s`
  if (prType === 'MAX_DISTANCE') return `${value}m`
  if (prType === 'MAX_VOLUME') return `${value} kg`
  return String(value)
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-4 sm:p-6">
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-12">
      <UIcon name="i-lucide-alert-circle" class="size-8 text-error mx-auto mb-3" />
      <p class="font-medium">
        {{ error }}
      </p>
      <UButton
        label="Back to Athletes"
        to="/trainer/athletes"
        variant="outline"
        color="neutral"
        class="mt-4"
      />
    </div>

    <template v-else-if="trainerStore.athleteProfile">
      <!-- Header -->
      <div class="flex items-center gap-2 mb-6">
        <UButton
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          size="sm"
          to="/trainer/athletes"
          aria-label="Back"
        />
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <UAvatar
            :src="trainerStore.athleteProfile.avatarUrl || undefined"
            :alt="`${trainerStore.athleteProfile.firstName} ${trainerStore.athleteProfile.lastName}`"
            size="lg"
          />
          <div class="min-w-0">
            <h1 class="text-xl font-bold truncate">
              {{ trainerStore.athleteProfile.firstName }}
              {{ trainerStore.athleteProfile.lastName }}
            </h1>
            <p class="text-sm text-muted truncate">
              {{ trainerStore.athleteProfile.email }}
            </p>
          </div>
        </div>
        <UButton
          label="Start Workout"
          icon="i-lucide-play"
          size="sm"
          :disabled="!!activeSession"
          @click="showStartModal = true"
        />
      </div>

      <!-- Active Session Banner -->
      <NuxtLink
        v-if="activeSession"
        :to="`/trainer/session/${athleteId}`"
        class="block mb-4"
      >
        <UCard class="hover:bg-elevated transition-colors cursor-pointer border-primary/30">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                <UIcon name="i-lucide-timer" class="size-4 text-primary" />
              </div>
              <div>
                <p class="text-sm font-medium">Active Workout</p>
                <p class="text-xs text-muted">{{ activeSession.name }}</p>
              </div>
            </div>
            <UButton label="Resume" icon="i-lucide-play" size="sm" />
          </div>
        </UCard>
      </NuxtLink>

      <!-- Stats Bar -->
      <div v-if="stats" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <UCard
          v-for="stat in [
            { label: 'Workouts', value: stats.totalWorkouts, icon: 'i-lucide-dumbbell' },
            { label: 'Volume', value: `${Math.round(stats.totalVolume / 1000)}t`, icon: 'i-lucide-weight' },
            { label: 'Streak', value: `${stats.currentStreak}d`, icon: 'i-lucide-flame' },
            { label: 'PRs', value: stats.totalPersonalRecords, icon: 'i-lucide-trophy' }
          ]" :key="stat.label"
        >
          <div class="text-center">
            <UIcon :name="stat.icon" class="size-4 text-muted mb-1" />
            <p class="text-lg font-bold">
              {{ stat.value }}
            </p>
            <p class="text-xs text-muted">
              {{ stat.label }}
            </p>
          </div>
        </UCard>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 mb-4 border-b border-default pb-3">
        <UButton
          v-for="tab in tabs"
          :key="tab.value"
          :label="tab.label"
          :icon="tab.icon"
          size="sm"
          :variant="activeTab === tab.value ? 'solid' : 'ghost'"
          :color="activeTab === tab.value ? 'primary' : 'neutral'"
          @click="activeTab = tab.value"
        />
      </div>

      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'">
        <div class="space-y-4">
          <!-- Bio -->
          <UCard v-if="trainerStore.athleteProfile.profile?.bio">
            <div>
              <p class="text-sm font-medium mb-1">
                Bio
              </p>
              <p class="text-sm text-muted">
                {{ trainerStore.athleteProfile.profile.bio }}
              </p>
            </div>
          </UCard>

          <!-- Profile details -->
          <UCard>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div v-if="trainerStore.athleteProfile.profile?.gender">
                <p class="text-muted">
                  Gender
                </p>
                <p class="font-medium">
                  {{ trainerStore.athleteProfile.profile.gender }}
                </p>
              </div>
              <div v-if="trainerStore.athleteProfile.profile?.weight">
                <p class="text-muted">
                  Weight
                </p>
                <p class="font-medium">
                  {{ trainerStore.athleteProfile.profile.weight }} kg
                </p>
              </div>
              <div v-if="trainerStore.athleteProfile.profile?.height">
                <p class="text-muted">
                  Height
                </p>
                <p class="font-medium">
                  {{ trainerStore.athleteProfile.profile.height }} cm
                </p>
              </div>
              <div v-if="trainerStore.athleteProfile.profile?.dateOfBirth">
                <p class="text-muted">
                  Date of Birth
                </p>
                <p class="font-medium">
                  {{ formatDate(trainerStore.athleteProfile.profile.dateOfBirth) }}
                </p>
              </div>
              <div v-if="stats?.memberSince">
                <p class="text-muted">
                  Member Since
                </p>
                <p class="font-medium">
                  {{ formatDate(stats.memberSince) }}
                </p>
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <!-- Workouts Tab -->
      <div v-else-if="activeTab === 'workouts'">
        <div v-if="sessionsLoading" class="flex justify-center py-8">
          <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-muted" />
        </div>

        <div v-else-if="sessions.length === 0" class="text-center py-8">
          <p class="text-sm text-muted">
            No workout history yet
          </p>
        </div>

        <div v-else class="space-y-2">
          <UCard
            v-for="session in sessions"
            :key="session.id"
          >
            <div class="flex items-center justify-between">
              <div class="min-w-0">
                <p class="font-medium truncate">
                  {{ session.name }}
                </p>
                <p class="text-xs text-muted">
                  {{ formatDate(session.startedAt) }}
                  ·
                  {{ formatDuration(session.startedAt, session.completedAt) }}
                  ·
                  {{ session.sessionExercises.length }} exercises
                </p>
              </div>
              <UBadge
                :label="session.status"
                :color="session.status === 'COMPLETED' ? 'success' : session.status === 'ABANDONED' ? 'error' : 'warning'"
                variant="subtle"
                size="xs"
              />
            </div>
          </UCard>

          <div
            v-if="sessionsMeta.totalPages > 1"
            class="flex justify-center pt-4"
          >
            <UPagination
              :model-value="sessionsMeta.page"
              :total="sessionsMeta.total"
              :items-per-page="sessionsMeta.limit"
              @update:model-value="loadSessions"
            />
          </div>
        </div>
      </div>

      <!-- Programs Tab -->
      <div v-else-if="activeTab === 'programs'">
        <div class="mb-4 flex justify-end">
          <UButton
            label="Assign Program"
            icon="i-lucide-clipboard-plus"
            size="sm"
            @click="showAssignModal = true"
          />
        </div>

        <div v-if="assignmentsLoading" class="flex justify-center py-8">
          <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-muted" />
        </div>

        <div v-else-if="assignments.length === 0" class="text-center py-8">
          <p class="text-sm text-muted">
            No programs assigned yet
          </p>
        </div>

        <div v-else class="space-y-2">
          <UCard
            v-for="assignment in assignments"
            :key="assignment.id"
          >
            <div class="flex items-center justify-between">
              <div class="min-w-0">
                <p class="font-medium truncate">
                  {{ assignment.program.name }}
                </p>
                <p class="text-xs text-muted">
                  Assigned {{ formatDate(assignment.assignedAt) }}
                  <template v-if="assignment.startDate">
                    · Starts {{ formatDate(assignment.startDate) }}
                  </template>
                </p>
              </div>
              <div class="flex items-center gap-2 shrink-0 ml-3">
                <UBadge
                  :label="assignment.status"
                  :color="assignment.status === 'ACTIVE' ? 'success' : assignment.status === 'COMPLETED' ? 'info' : 'warning'"
                  variant="subtle"
                  size="xs"
                />
                <UButton
                  v-if="assignment.status === 'ACTIVE'"
                  icon="i-lucide-x"
                  size="xs"
                  variant="ghost"
                  color="error"
                  aria-label="Cancel assignment"
                  @click="cancelAssignment(assignment.id)"
                />
              </div>
            </div>
          </UCard>
        </div>

        <TrainerAssignProgramModal
          v-model:open="showAssignModal"
          :athlete-id="athleteId"
          :athlete-name="`${trainerStore.athleteProfile?.firstName} ${trainerStore.athleteProfile?.lastName}`"
          :assigned-program-ids="assignments.filter(a => a.status === 'ACTIVE').map(a => a.program.sourceProgramId).filter(Boolean) as string[]"
          @assigned="loadAssignments"
        />
      </div>

      <!-- Records Tab -->
      <div v-else-if="activeTab === 'records'">
        <div v-if="recordsLoading" class="flex justify-center py-8">
          <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-muted" />
        </div>

        <div v-else-if="records.length === 0" class="text-center py-8">
          <p class="text-sm text-muted">
            No personal records yet
          </p>
        </div>

        <div v-else class="space-y-2">
          <UCard
            v-for="pr in records"
            :key="pr.id"
          >
            <div class="flex items-center justify-between">
              <div class="min-w-0">
                <p class="font-medium truncate">
                  {{ pr.exerciseName }}
                </p>
                <p class="text-xs text-muted">
                  {{ pr.prType.replace(/_/g, ' ') }}
                  · {{ formatDate(pr.achievedOn) }}
                </p>
              </div>
              <p class="font-bold text-primary shrink-0 ml-3">
                {{ formatPRValue(pr.prType, pr.value) }}
              </p>
            </div>
          </UCard>

          <div
            v-if="recordsMeta.totalPages > 1"
            class="flex justify-center pt-4"
          >
            <UPagination
              :model-value="recordsMeta.page"
              :total="recordsMeta.total"
              :items-per-page="recordsMeta.limit"
              @update:model-value="loadRecords"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- Start Workout Modal -->
    <UModal v-model:open="showStartModal">
      <template #content>
        <div class="p-6 space-y-4">
          <p class="font-semibold text-lg">
            Start Workout for Athlete
          </p>
          <p class="text-sm text-muted">
            This will start a workout session on behalf of
            <span class="font-medium">{{ trainerStore.athleteProfile?.firstName }}</span>.
          </p>
          <UFormField v-if="activeAssignments.length > 0" label="Program">
            <select
              :value="selectedAssignmentId ?? ''"
              class="w-full rounded-md bg-default ring ring-accented text-highlighted px-3 py-2 text-sm focus:outline-primary"
              @change="selectedAssignmentId = ($event.target as HTMLSelectElement).value || null"
            >
              <option value="">
                Freestyle (no program)
              </option>
              <option
                v-for="a in activeAssignments"
                :key="a.id"
                :value="a.id"
              >
                {{ a.program.name }}
              </option>
            </select>
          </UFormField>
          <UFormField label="Session Name" :hint="selectedAssignmentId ? 'Auto-filled from program' : 'Optional'">
            <UInput
              v-model="sessionName"
              placeholder="e.g. Upper Body"
              class="block"
            />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              @click="showStartModal = false"
            />
            <UButton
              label="Start Workout"
              icon="i-lucide-play"
              :loading="startingSession"
              @click="startSession"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
