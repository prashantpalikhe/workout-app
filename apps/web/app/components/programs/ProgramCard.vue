<script setup lang="ts">
import type { Program } from '~/stores/programs'

defineProps<{
  program: Program
}>()

defineEmits<{
  edit: []
  delete: []
}>()

const { formatEnum } = useFormatEnum()

function exercisePreview(program: Program) {
  const names = program.exercises
    .slice(0, 3)
    .map(e => e.exercise.name)
  if (program.exercises.length > 3) {
    names.push(`+${program.exercises.length - 3} more`)
  }
  return names.join(', ')
}
</script>

<template>
  <div class="border border-default rounded-lg p-4 hover:bg-elevated transition-colors cursor-pointer">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 mb-1">
          <h3 class="font-medium truncate">
            {{ program.name }}
          </h3>
          <UBadge variant="subtle" size="xs">
            {{ program.exercises.length }} {{ program.exercises.length === 1 ? 'exercise' : 'exercises' }}
          </UBadge>
        </div>

        <p
          v-if="program.description"
          class="text-sm text-muted line-clamp-1 mb-1"
        >
          {{ program.description }}
        </p>

        <p
          v-if="program.exercises.length"
          class="text-xs text-muted truncate"
        >
          {{ exercisePreview(program) }}
        </p>
      </div>

      <UDropdownMenu
        :items="[
          [{
            label: 'Edit',
            icon: 'i-lucide-pencil',
            onSelect: () => $emit('edit'),
          },
          {
            label: 'Delete',
            icon: 'i-lucide-trash-2',
            onSelect: () => $emit('delete'),
          }],
        ]"
        :content="{ align: 'end' as const }"
      >
        <UButton
          icon="i-lucide-ellipsis-vertical"
          color="neutral"
          variant="ghost"
          size="xs"
          aria-label="Program options"
          @click.stop
        />
      </UDropdownMenu>
    </div>
  </div>
</template>
