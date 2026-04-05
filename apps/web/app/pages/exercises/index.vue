<script setup lang="ts">
import type { TableColumn } from '#ui/types'
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

// Fetch on mount
onMounted(async () => {
  await Promise.all([
    exerciseStore.fetchExercises(),
    exerciseStore.fetchMuscleGroups()
  ])
})

// Table columns
const columns: TableColumn<Exercise>[] = [
  {
    accessorKey: 'name',
    header: 'Name'
  },
  {
    accessorKey: 'equipment',
    header: 'Equipment'
  },
  {
    accessorKey: 'movementPattern',
    header: 'Movement'
  },
  {
    accessorKey: 'trackingType',
    header: 'Tracking'
  },
  {
    accessorKey: 'muscleGroups',
    header: 'Muscles'
  },
  {
    id: 'actions',
    header: ''
  }
]

// Actions
function openCreate() {
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
    [{
      label: 'View Details',
      icon: 'i-lucide-eye',
      onSelect: () => openDetail(exercise)
    }]
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
      title="Exercise Library"
      description="Browse, search, and manage your exercises"
    >
      <template #links>
        <UButton
          label="Create Exercise"
          icon="i-lucide-plus"
          @click="openCreate"
        />
      </template>
    </AppPageHeader>

    <ExercisesExerciseFilters />

    <!-- Mobile: card list -->
    <div class="md:hidden mb-6 space-y-2">
      <div
        v-if="exerciseStore.loading && !exerciseStore.exercises.length"
        class="space-y-2"
      >
        <USkeleton v-for="i in 5" :key="i" class="h-20 w-full rounded-lg" />
      </div>
      <template v-else-if="exerciseStore.exercises.length">
        <button
          v-for="exercise in exerciseStore.exercises"
          :key="exercise.id"
          type="button"
          class="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-default bg-default hover:bg-elevated transition-colors"
          @click="openDetail(exercise)"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium truncate">{{ exercise.name }}</span>
              <UBadge
                v-if="!exercise.isGlobal"
                color="primary"
                variant="subtle"
                size="xs"
              >
                Custom
              </UBadge>
            </div>
            <div class="mt-0.5 text-xs text-muted truncate">
              {{ [
                formatEnum(exercise.equipment),
                formatEnum(exercise.movementPattern)
              ].filter(Boolean).join(' · ') || '—' }}
            </div>
            <div v-if="exercise.muscleGroups?.length" class="mt-2">
              <ExercisesExerciseMuscleGroupBadges
                :muscle-groups="exercise.muscleGroups"
              />
            </div>
          </div>
          <UDropdownMenu
            :items="getRowActions(exercise)"
            :content="{ align: 'end' }"
          >
            <UButton
              icon="i-lucide-ellipsis-vertical"
              color="neutral"
              variant="ghost"
              size="sm"
              @click.stop
            />
          </UDropdownMenu>
        </button>
      </template>
      <div
        v-else
        class="text-center py-8 rounded-lg border border-default"
      >
        <p class="text-muted mb-4">
          No exercises found
        </p>
        <UButton
          v-if="exerciseStore.hasActiveFilters"
          label="Clear Filters"
          variant="outline"
          @click="exerciseStore.resetFilters()"
        />
      </div>
    </div>

    <!-- Desktop: full table -->
    <UTable
      :data="exerciseStore.exercises"
      :columns="columns"
      :loading="exerciseStore.loading"
      class="mb-6 hidden md:block"
      :ui="{ tr: 'cursor-pointer' }"
      @select="(_e: Event, row: any) => openDetail(row.original)"
    >
      <template #name-cell="{ row }">
        <div class="flex items-center gap-2">
          <span class="font-medium">{{ row.original.name }}</span>
          <UBadge
            v-if="!row.original.isGlobal"
            color="primary"
            variant="subtle"
            size="xs"
          >
            Custom
          </UBadge>
        </div>
      </template>

      <template #equipment-cell="{ row }">
        {{ formatEnum(row.original.equipment) }}
      </template>

      <template #movementPattern-cell="{ row }">
        {{ formatEnum(row.original.movementPattern) }}
      </template>

      <template #trackingType-cell="{ row }">
        {{ formatEnum(row.original.trackingType) }}
      </template>

      <template #muscleGroups-cell="{ row }">
        <ExercisesExerciseMuscleGroupBadges
          :muscle-groups="row.original.muscleGroups"
        />
      </template>

      <template #actions-cell="{ row }">
        <UDropdownMenu
          :items="getRowActions(row.original)"
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
      </template>

      <template #empty>
        <div class="text-center py-8">
          <p class="text-muted mb-4">
            No exercises found
          </p>
          <UButton
            v-if="exerciseStore.hasActiveFilters"
            label="Clear Filters"
            variant="outline"
            @click="exerciseStore.resetFilters()"
          />
        </div>
      </template>
    </UTable>

    <div
      v-if="exerciseStore.meta.totalPages > 1"
      class="flex justify-center"
    >
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
