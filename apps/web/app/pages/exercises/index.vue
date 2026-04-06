<script setup lang="ts">
import type { Exercise } from '~/stores/exercises'

definePageMeta({
  middleware: 'auth'
})

const exerciseStore = useExerciseStore()
const toast = useToast()
const { formatEnum } = useFormatEnum()

const router = useRouter()

// Modal state
const showFormModal = ref(false)
const editingExercise = ref<Exercise | null>(null)
const showDeleteDialog = ref(false)
const deletingExercise = ref<Exercise | null>(null)

onMounted(async () => {
  await Promise.all([
    exerciseStore.fetchExercises(),
    exerciseStore.fetchMuscleGroups()
  ])
})

// Actions
function _openCreate() {
  editingExercise.value = null
  showFormModal.value = true
}

function openEdit(exercise: Exercise) {
  editingExercise.value = exercise
  showFormModal.value = true
}

function openDelete(exercise: Exercise) {
  deletingExercise.value = exercise
  showDeleteDialog.value = true
}

function openDetail(exercise: Exercise) {
  router.push(`/exercises/${exercise.id}`)
}

function onFormSuccess() {
  showFormModal.value = false
  toast.add({
    title: editingExercise.value ? 'Exercise updated' : 'Exercise created',
    color: 'success'
  })
}

async function onDeleteConfirm() {
  if (!deletingExercise.value) return
  try {
    await exerciseStore.deleteExercise(deletingExercise.value.id)
    toast.add({ title: 'Exercise deleted', color: 'success' })
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError?.data?.message || 'Failed to delete exercise',
      color: 'error'
    })
  } finally {
    showDeleteDialog.value = false
    deletingExercise.value = null
  }
}

function getRowActions(exercise: Exercise) {
  const items = [
    [
      {
        label: 'View Details',
        icon: 'i-lucide-eye',
        onSelect: () => openDetail(exercise)
      }
    ]
  ]

  if (!exercise.isGlobal) {
    items.push([
      {
        label: 'Edit',
        icon: 'i-lucide-pencil',
        onSelect: () => openEdit(exercise)
      },
      {
        label: 'Delete',
        icon: 'i-lucide-trash-2',
        onSelect: () => openDelete(exercise)
      }
    ])
  }

  return items
}
</script>

<template>
  <UContainer>
    <AppPageHeader
      title="Exercises"
      description="Browse, search, and manage your exercises"
    >
      <!-- <template #links>
        <UButton
          label="Create Exercise"
          icon="i-lucide-plus"
          @click="openCreate"
        />
      </template> -->
    </AppPageHeader>

    <ExercisesExerciseFilters />

    <!-- Loading -->
    <div v-if="exerciseStore.loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
    </div>

    <!-- Exercise list -->
    <div v-else-if="exerciseStore.exercises.length" class="mb-6 space-y-1">
      <div
        v-for="exercise in exerciseStore.exercises"
        :key="exercise.id"
        class="flex items-center gap-3 p-2 rounded-lg hover:bg-elevated transition-colors cursor-pointer"
        @click="openDetail(exercise)"
      >
        <img
          v-if="exercise.imageUrls?.[0]"
          :src="exercise.imageUrls[0]"
          :alt="exercise.name"
          class="size-10 rounded-lg object-cover shrink-0 bg-elevated"
        >
        <div
          v-else
          class="size-10 rounded-lg bg-elevated flex items-center justify-center shrink-0"
        >
          <UIcon name="i-lucide-dumbbell" class="size-4 text-muted" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <span class="font-medium text-sm truncate">{{ exercise.name }}</span>
            <UBadge
              v-if="!exercise.isGlobal"
              color="primary"
              variant="subtle"
              size="xs"
              class="shrink-0"
            >
              Custom
            </UBadge>
          </div>
          <span class="text-xs text-muted">
            {{ [formatEnum(exercise.equipment), exercise.muscleGroups?.filter(mg => mg.role === 'PRIMARY').map(mg => mg.muscleGroup.name).join(', ')].filter(Boolean).join(' · ') }}
          </span>
        </div>
        <UDropdownMenu
          v-if="!exercise.isGlobal"
          :items="getRowActions(exercise)"
          :content="{ align: 'end' }"
        >
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
            size="xs"
            @click.stop
          />
        </UDropdownMenu>
      </div>
    </div>

    <!-- Empty state -->
    <AppEmptyState
      v-else
      icon="i-lucide-search-x"
      title="No exercises found"
    >
      <UButton
        v-if="exerciseStore.hasActiveFilters"
        label="Clear Filters"
        variant="outline"
        @click="exerciseStore.resetFilters()"
      />
    </AppEmptyState>

    <div v-if="exerciseStore.meta.totalPages > 1" class="flex justify-center mt-6">
      <UPagination
        :page="exerciseStore.meta.page"
        :total="exerciseStore.meta.total"
        :items-per-page="exerciseStore.meta.limit"
        @update:page="exerciseStore.setPage"
      />
    </div>

    <!-- Form Modal (Create/Edit) -->
    <ExercisesExerciseFormModal
      v-model="showFormModal"
      :exercise="editingExercise"
      @success="onFormSuccess"
    />

    <!-- Delete Confirmation -->
    <ExercisesExerciseDeleteDialog
      v-model="showDeleteDialog"
      :exercise="deletingExercise"
      @confirm="onDeleteConfirm"
    />
  </UContainer>
</template>
