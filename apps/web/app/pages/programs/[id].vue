<script setup lang="ts">
import type { ProgramExercise } from '~/stores/programs'
import draggable from 'vuedraggable'

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const programStore = useProgramStore()
const toast = useToast()

const authStore = useAuthStore()
const programId = computed(() => route.params.id as string)

// Modal state
const showExercisePicker = ref(false)
const showProgramFormModal = ref(false)
const showDeleteDialog = ref(false)

// Fetch on mount
onMounted(() => {
  programStore.fetchProgramById(programId.value)
  if (programStore.folders.length === 0) {
    programStore.fetchFolders()
  }
})

watch(programId, (id) => {
  programStore.fetchProgramById(id)
})

const program = computed(() => programStore.selectedProgram)
const isOwner = computed(() => program.value?.createdById === authStore.user?.id)

// Writable computed for vuedraggable v-model
const exerciseList = computed({
  get: () => program.value?.exercises ?? [],
  set: (val: ProgramExercise[]) => {
    if (program.value) {
      program.value.exercises = val
    }
  }
})

// DnD reorder
async function onDragEnd() {
  if (!program.value) return
  const items = program.value.exercises.map((e, i) => ({
    id: e.id,
    sortOrder: i
  }))
  try {
    await programStore.reorderExercises(programId.value, items)
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError?.data?.message || 'Failed to reorder exercises',
      color: 'error'
    })
    await programStore.fetchProgramById(programId.value)
  }
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
      color: 'error'
    })
  }
}

// Program actions
function onProgramFormSuccess() {
  showProgramFormModal.value = false
  toast.add({ title: 'Program updated', color: 'success' })
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
      color: 'error'
    })
  } finally {
    showDeleteDialog.value = false
  }
}
</script>

<template>
  <UContainer>
    <!-- Loading -->
    <div v-if="programStore.detailLoading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
    </div>

    <div v-else-if="program">
      <AppPageHeader
        :title="program.name"
        :description="program.description || undefined"
        back="/programs"
      >
        <template v-if="isOwner" #links>
          <UButton
            label="Add Exercise"
            icon="i-lucide-plus"
            @click="showExercisePicker = true"
          />
          <UDropdownMenu
            :items="[[
              { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => (showProgramFormModal = true) },
              { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => (showDeleteDialog = true) }
            ]]"
            :content="{ align: 'end' as const }"
          >
            <UButton
              icon="i-lucide-ellipsis-vertical"
              color="neutral"
              variant="outline"
              aria-label="Program options"
            />
          </UDropdownMenu>
        </template>
      </AppPageHeader>

      <!-- Badges -->
      <div v-if="program.folder || program.assignedBy" class="flex items-center gap-2 mb-6">
        <UBadge v-if="program.folder" variant="subtle" size="sm">
          <UIcon name="i-lucide-folder" class="size-3 mr-1" />
          {{ program.folder.name }}
        </UBadge>
        <UBadge v-if="program.assignedBy" color="primary" variant="subtle" size="sm">
          <UIcon name="i-lucide-user-check" class="size-3 mr-1" />
          Assigned by {{ program.assignedBy.firstName }} {{ program.assignedBy.lastName }}
        </UBadge>
      </div>

      <!-- Exercise list with drag-and-drop -->
      <draggable
        v-if="program.exercises.length"
        v-model="exerciseList"
        item-key="id"
        handle=".drag-handle"
        :disabled="!isOwner"
        :animation="200"
        ghost-class="opacity-50"
        class="space-y-3"
        @end="onDragEnd"
      >
        <template #item="{ element }">
          <ProgramsProgramExerciseCard
            :exercise="element"
            :readonly="!isOwner"
            @remove="onRemoveExercise(element)"
          />
        </template>
      </draggable>

      <!-- Empty exercise state -->
      <AppEmptyState
        v-if="!program.exercises.length"
        icon="i-lucide-dumbbell"
        :title="isOwner ? 'No exercises yet' : 'No exercises in this program'"
        :description="isOwner ? 'Add exercises from the library to get started.' : undefined"
      >
        <UButton
          v-if="isOwner"
          label="Add Exercise"
          icon="i-lucide-plus"
          @click="showExercisePicker = true"
        />
      </AppEmptyState>
    </div>

    <!-- Modals -->
    <ProgramsProgramExercisePicker
      v-model="showExercisePicker"
      @success="onExercisePickerSuccess"
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
