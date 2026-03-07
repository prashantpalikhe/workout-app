<script setup lang="ts">
import type { Program, ProgramExercise } from '~/stores/programs'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const programStore = useProgramStore()
const toast = useToast()

const programId = computed(() => route.params.id as string)

// Modal state
const showExercisePicker = ref(false)
const showExerciseFormModal = ref(false)
const editingExercise = ref<ProgramExercise | null>(null)
const showProgramFormModal = ref(false)
const showDeleteDialog = ref(false)

// Fetch on mount
onMounted(() => {
  programStore.fetchProgramById(programId.value)
  // Ensure folders are loaded for the edit program modal
  if (programStore.folders.length === 0) {
    programStore.fetchFolders()
  }
})

// Watch for route param changes
watch(programId, (id) => {
  programStore.fetchProgramById(id)
})

const program = computed(() => programStore.selectedProgram)

// Exercise actions
function openEditExercise(exercise: ProgramExercise) {
  editingExercise.value = exercise
  showExerciseFormModal.value = true
}

function onExerciseFormSuccess() {
  showExerciseFormModal.value = false
  toast.add({ title: 'Exercise targets updated', color: 'success' })
}

function onExercisePickerSuccess() {
  toast.add({ title: 'Exercise added', color: 'success' })
}

async function onRemoveExercise(exercise: ProgramExercise) {
  try {
    await programStore.removeExercise(programId.value, exercise.id)
    toast.add({ title: 'Exercise removed', color: 'success' })
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError?.data?.message || 'Failed to remove exercise',
      color: 'error',
    })
  }
}

// Reorder
async function onMoveUp(index: number) {
  if (!program.value || index <= 0) return
  const exercises = program.value.exercises
  const items = exercises.map((e, i) => ({
    id: e.id,
    sortOrder: i === index ? index - 1 : i === index - 1 ? index : i,
  }))
  await programStore.reorderExercises(programId.value, items)
}

async function onMoveDown(index: number) {
  if (!program.value || index >= program.value.exercises.length - 1) return
  const exercises = program.value.exercises
  const items = exercises.map((e, i) => ({
    id: e.id,
    sortOrder: i === index ? index + 1 : i === index + 1 ? index : i,
  }))
  await programStore.reorderExercises(programId.value, items)
}

// Program actions
function onProgramFormSuccess() {
  showProgramFormModal.value = false
  toast.add({ title: 'Program updated', color: 'success' })
  // Refetch to update header
  programStore.fetchProgramById(programId.value)
}

async function onDeleteConfirm() {
  try {
    await programStore.deleteProgram(programId.value)
    toast.add({ title: 'Program deleted', color: 'success' })
    navigateTo('/programs')
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError?.data?.message || 'Failed to delete program',
      color: 'error',
    })
  } finally {
    showDeleteDialog.value = false
  }
}
</script>

<template>
  <UContainer>
    <!-- Loading skeleton -->
    <div v-if="programStore.detailLoading" class="space-y-4 mt-8">
      <USkeleton class="h-8 w-1/3" />
      <USkeleton class="h-4 w-1/2" />
      <USkeleton class="h-20 w-full rounded-lg" />
      <USkeleton class="h-20 w-full rounded-lg" />
    </div>

    <div v-else-if="program">
      <UPageHeader
        :title="program.name"
        :description="program.description || undefined"
      >
        <template #links>
          <UButton
            label="Edit"
            icon="i-lucide-pencil"
            color="neutral"
            variant="outline"
            @click="showProgramFormModal = true"
          />
          <UButton
            label="Add Exercise"
            icon="i-lucide-plus"
            @click="showExercisePicker = true"
          />
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="outline"
            aria-label="Delete program"
            @click="showDeleteDialog = true"
          />
        </template>
      </UPageHeader>

      <!-- Folder badge -->
      <div v-if="program.folder" class="mb-6">
        <UBadge variant="subtle" size="sm">
          <UIcon name="i-lucide-folder" class="size-3 mr-1" />
          {{ program.folder.name }}
        </UBadge>
      </div>

      <!-- Exercise list -->
      <div v-if="program.exercises.length" class="space-y-3">
        <ProgramsProgramExerciseCard
          v-for="(exercise, index) in program.exercises"
          :key="exercise.id"
          :exercise="exercise"
          :is-first="index === 0"
          :is-last="index === program.exercises.length - 1"
          @edit="openEditExercise(exercise)"
          @remove="onRemoveExercise(exercise)"
          @move-up="onMoveUp(index)"
          @move-down="onMoveDown(index)"
        />
      </div>

      <!-- Empty exercise state -->
      <div
        v-else
        class="text-center py-12 border border-dashed border-default rounded-lg"
      >
        <UIcon name="i-lucide-dumbbell" class="size-10 text-muted mx-auto mb-3" />
        <p class="text-muted mb-4">
          No exercises yet. Add exercises from the library.
        </p>
        <UButton
          label="Add Exercise"
          icon="i-lucide-plus"
          @click="showExercisePicker = true"
        />
      </div>
    </div>

    <!-- Modals -->
    <ProgramsProgramExercisePicker
      v-model="showExercisePicker"
      @success="onExercisePickerSuccess"
    />

    <ProgramsProgramExerciseFormModal
      v-model="showExerciseFormModal"
      :exercise="editingExercise"
      @success="onExerciseFormSuccess"
    />

    <ProgramsProgramFormModal
      v-model="showProgramFormModal"
      :program="program"
      @success="onProgramFormSuccess"
    />

    <ProgramsProgramDeleteDialog
      v-model="showDeleteDialog"
      :program="program"
      @confirm="onDeleteConfirm"
    />
  </UContainer>
</template>
