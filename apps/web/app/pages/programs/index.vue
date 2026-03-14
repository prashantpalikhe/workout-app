<script setup lang="ts">
import type { Program, ProgramFolder } from '~/stores/programs'

definePageMeta({
  middleware: 'auth',
})

const programStore = useProgramStore()
const toast = useToast()

// Modal state
const showProgramFormModal = ref(false)
const editingProgram = ref<Program | null>(null)
const showProgramDeleteDialog = ref(false)
const deletingProgram = ref<Program | null>(null)
const showFolderFormModal = ref(false)
const editingFolder = ref<ProgramFolder | null>(null)
const showFolderDeleteDialog = ref(false)
const deletingFolder = ref<ProgramFolder | null>(null)

// Folder collapse state
const collapsedFolders = ref(new Set<string>())

function toggleFolder(folderId: string) {
  if (collapsedFolders.value.has(folderId)) {
    collapsedFolders.value.delete(folderId)
  } else {
    collapsedFolders.value.add(folderId)
  }
}

// Fetch on mount
onMounted(async () => {
  await Promise.all([
    programStore.fetchPrograms(),
    programStore.fetchFolders(),
  ])
})

// Program actions
function openCreateProgram() {
  editingProgram.value = null
  showProgramFormModal.value = true
}

function openEditProgram(program: Program) {
  editingProgram.value = program
  showProgramFormModal.value = true
}

function openDeleteProgram(program: Program) {
  deletingProgram.value = program
  showProgramDeleteDialog.value = true
}

function onProgramFormSuccess(program?: Program) {
  showProgramFormModal.value = false
  toast.add({
    title: editingProgram.value ? 'Program updated' : 'Program created',
    color: 'success',
  })
  // Navigate to the newly created program's detail page
  if (!editingProgram.value && program?.id) {
    navigateTo(`/programs/${program.id}`)
  }
}

async function onProgramDeleteConfirm() {
  if (!deletingProgram.value) return
  try {
    await programStore.deleteProgram(deletingProgram.value.id)
    toast.add({ title: 'Program deleted', color: 'success' })
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError?.data?.message || 'Failed to delete program',
      color: 'error',
    })
  } finally {
    showProgramDeleteDialog.value = false
    deletingProgram.value = null
  }
}

// Folder actions
function openCreateFolder() {
  editingFolder.value = null
  showFolderFormModal.value = true
}

function openEditFolder(folder: ProgramFolder) {
  editingFolder.value = folder
  showFolderFormModal.value = true
}

function openDeleteFolder(folder: ProgramFolder) {
  deletingFolder.value = folder
  showFolderDeleteDialog.value = true
}

function onFolderFormSuccess() {
  showFolderFormModal.value = false
  toast.add({
    title: editingFolder.value ? 'Folder updated' : 'Folder created',
    color: 'success',
  })
}

async function onFolderDeleteConfirm() {
  if (!deletingFolder.value) return
  try {
    await programStore.deleteFolder(deletingFolder.value.id)
    toast.add({ title: 'Folder deleted', color: 'success' })
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError?.data?.message || 'Failed to delete folder',
      color: 'error',
    })
  } finally {
    showFolderDeleteDialog.value = false
    deletingFolder.value = null
  }
}

function getFolderPrograms(folderId: string): Program[] {
  return programStore.programsByFolder.byFolder.get(folderId) || []
}
</script>

<template>
  <UContainer>
    <UPageHeader
      title="Programs"
      description="Organize your workout routines"
    >
      <template #links>
        <UButton
          label="New Program"
          icon="i-lucide-plus"
          @click="openCreateProgram"
        />
        <UButton
          label="New Folder"
          icon="i-lucide-folder-plus"
          color="neutral"
          variant="outline"
          @click="openCreateFolder"
        />
      </template>
    </UPageHeader>

    <!-- Loading -->
    <div v-if="programStore.loading" class="space-y-4">
      <USkeleton class="h-16 w-full rounded-lg" />
      <USkeleton class="h-16 w-full rounded-lg" />
      <USkeleton class="h-16 w-full rounded-lg" />
    </div>

    <div v-else>
      <!-- Folders -->
      <div
        v-for="folder in programStore.folders"
        :key="folder.id"
        class="mb-6"
      >
        <!-- Folder header -->
        <div
          class="flex items-center gap-2 py-2 px-1 cursor-pointer select-none hover:bg-elevated rounded-md transition-colors"
          @click="toggleFolder(folder.id)"
        >
          <UIcon
            name="i-lucide-chevron-right"
            class="size-4 shrink-0 transition-transform"
            :class="{ 'rotate-90': !collapsedFolders.has(folder.id) }"
          />
          <UIcon name="i-lucide-folder" class="size-4 shrink-0 text-muted" />
          <span class="font-medium">{{ folder.name }}</span>
          <UBadge variant="subtle" size="xs">
            {{ getFolderPrograms(folder.id).length }}
          </UBadge>

          <div class="ml-auto">
            <UDropdownMenu
              :items="[
                [{
                  label: 'Edit Folder',
                  icon: 'i-lucide-pencil',
                  onSelect: () => openEditFolder(folder),
                },
                {
                  label: 'Delete Folder',
                  icon: 'i-lucide-trash-2',
                  onSelect: () => openDeleteFolder(folder),
                }],
              ]"
              :content="{ align: 'end' as const }"
            >
              <UButton
                icon="i-lucide-ellipsis-vertical"
                color="neutral"
                variant="ghost"
                size="xs"
                aria-label="Folder options"
                @click.stop
              />
            </UDropdownMenu>
          </div>
        </div>

        <!-- Programs in folder -->
        <div
          v-show="!collapsedFolders.has(folder.id)"
          class="ml-6 space-y-2 mt-2"
        >
          <ProgramsProgramCard
            v-for="program in getFolderPrograms(folder.id)"
            :key="program.id"
            :program="program"
            @click="navigateTo(`/programs/${program.id}`)"
            @edit="openEditProgram(program)"
            @delete="openDeleteProgram(program)"
          />
          <p
            v-if="getFolderPrograms(folder.id).length === 0"
            class="text-sm text-muted italic py-2"
          >
            No programs in this folder
          </p>
        </div>
      </div>

      <!-- Unfiled Programs -->
      <div v-if="programStore.programsByFolder.unfiled.length" class="mb-6">
        <h3
          v-if="programStore.folders.length"
          class="text-sm font-medium text-muted mb-3 px-1"
        >
          Unfiled Programs
        </h3>
        <div class="space-y-2">
          <ProgramsProgramCard
            v-for="program in programStore.programsByFolder.unfiled"
            :key="program.id"
            :program="program"
            @click="navigateTo(`/programs/${program.id}`)"
            @edit="openEditProgram(program)"
            @delete="openDeleteProgram(program)"
          />
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="!programStore.loading && programStore.programs.length === 0 && programStore.folders.length === 0"
        class="text-center py-12"
      >
        <UIcon name="i-lucide-clipboard-list" class="size-12 text-muted mx-auto mb-4" />
        <p class="text-lg font-medium mb-2">
          No programs yet
        </p>
        <p class="text-muted mb-6">
          Create your first program to organize your workouts
        </p>
        <UButton
          label="Create Program"
          icon="i-lucide-plus"
          @click="openCreateProgram"
        />
      </div>
    </div>

    <!-- Modals -->
    <ProgramsProgramFormModal
      v-model="showProgramFormModal"
      :program="editingProgram"
      @success="onProgramFormSuccess"
    />

    <ProgramsProgramDeleteDialog
      v-model="showProgramDeleteDialog"
      :program="deletingProgram"
      @confirm="onProgramDeleteConfirm"
    />

    <ProgramsProgramFolderFormModal
      v-model="showFolderFormModal"
      :folder="editingFolder"
      @success="onFolderFormSuccess"
    />

    <ProgramsProgramFolderDeleteDialog
      v-model="showFolderDeleteDialog"
      :folder="deletingFolder"
      @confirm="onFolderDeleteConfirm"
    />
  </UContainer>
</template>
