<script setup lang="ts">
const props = defineProps<{
  athleteId: string
  athleteName: string
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ assigned: [] }>()

const { api } = useApiClient()
const toast = useToast()

interface Program {
  id: string
  name: string
  description: string | null
}

interface PaginatedPrograms {
  data: Program[]
  meta: { total: number }
}

const loading = ref(true)
const programs = ref<Program[]>([])
const selectedProgramId = ref('')
const startDate = ref('')
const allowDeviations = ref(true)
const assigning = ref(false)

// Load trainer's programs
watch(open, async (isOpen) => {
  if (isOpen && programs.value.length === 0) {
    loading.value = true
    try {
      const data = await api<PaginatedPrograms>('/programs?limit=100')
      programs.value = data.data
    } catch {
      toast.add({ title: 'Failed to load programs', color: 'error' })
    } finally {
      loading.value = false
    }
  }
})

const programOptions = computed(() =>
  programs.value.map((p) => ({
    label: p.name,
    value: p.id,
  })),
)

async function assign() {
  if (!selectedProgramId.value) {
    toast.add({ title: 'Please select a program', color: 'warning' })
    return
  }

  assigning.value = true
  try {
    await api('/trainer/assignments', {
      method: 'POST',
      body: {
        programId: selectedProgramId.value,
        athleteId: props.athleteId,
        startDate: startDate.value || undefined,
        allowSessionDeviations: allowDeviations.value,
      },
    })
    toast.add({ title: 'Program assigned', color: 'success' })
    open.value = false
    selectedProgramId.value = ''
    startDate.value = ''
    allowDeviations.value = true
    emit('assigned')
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError?.data?.message || 'Failed to assign program',
      color: 'error',
    })
  } finally {
    assigning.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 space-y-5">
        <div>
          <p class="font-semibold text-lg">Assign Program</p>
          <p class="text-sm text-muted mt-1">
            Assign one of your programs to <span class="font-medium">{{ athleteName }}</span>
          </p>
        </div>

        <div v-if="loading" class="flex justify-center py-4">
          <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-muted" />
        </div>

        <template v-else>
          <div v-if="programs.length === 0" class="text-center py-4">
            <p class="text-sm text-muted">You don't have any programs yet.</p>
            <UButton
              label="Create a Program"
              to="/programs"
              size="sm"
              variant="outline"
              class="mt-2"
              @click="open = false"
            />
          </div>

          <template v-else>
            <UFormField label="Program">
              <USelect
                v-model="selectedProgramId"
                :items="programOptions"
                value-key="value"
                placeholder="Select a program"
                class="block"
              />
            </UFormField>

            <UFormField label="Start Date (optional)">
              <UInput
                v-model="startDate"
                type="date"
                class="block"
              />
            </UFormField>

            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium">Allow Session Deviations</p>
                <p class="text-xs text-muted">
                  Athlete can modify exercises during a workout
                </p>
              </div>
              <USwitch v-model="allowDeviations" />
            </div>
          </template>
        </template>

        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            @click="open = false"
          />
          <UButton
            v-if="programs.length > 0"
            label="Assign"
            icon="i-lucide-clipboard-check"
            :loading="assigning"
            :disabled="!selectedProgramId"
            @click="assign"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
