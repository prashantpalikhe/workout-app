<script setup lang="ts">
import type { Exercise } from '~/stores/exercises'

defineProps<{
  exercise: Exercise | null
  loading: boolean
}>()

const emit = defineEmits<{
  edit: [exercise: Exercise]
  delete: [exercise: Exercise]
}>()

const open = defineModel<boolean>({ default: false })

const { formatEnum } = useFormatEnum()

const carouselRef = ref()
const currentSlide = ref(0)
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="exercise?.name || 'Exercise Detail'"
    side="right"
  >
    <template #body>
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
      </div>

      <div v-else-if="exercise" class="space-y-6">
        <!-- Images -->
        <div v-if="exercise.imageUrls.length" class="relative -mx-4 -mt-4 overflow-hidden">
          <UCarousel
            ref="carouselRef"
            v-slot="{ item }"
            :items="exercise.imageUrls"
            class="overflow-hidden"
            :ui="{ container: '-ms-0', item: 'ps-0' }"
            @select="currentSlide = $event"
          >
            <img :src="item" :alt="exercise.name" class="w-full aspect-[4/3] object-cover">
          </UCarousel>

          <!-- Counter -->
          <div v-if="exercise.imageUrls.length > 1" class="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-black/50 text-white text-xs backdrop-blur-sm">
            {{ currentSlide + 1 }} / {{ exercise.imageUrls.length }}
          </div>

          <!-- Prev / Next -->
          <template v-if="exercise.imageUrls.length > 1">
            <button
              class="absolute left-2 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/40 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-all"
              @click="carouselRef?.emblaApi?.scrollPrev()"
            >
              <UIcon name="i-lucide-chevron-left" class="size-5" />
            </button>
            <button
              class="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/40 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-all"
              @click="carouselRef?.emblaApi?.scrollNext()"
            >
              <UIcon name="i-lucide-chevron-right" class="size-5" />
            </button>
          </template>
        </div>

        <!-- Badge + details -->
        <div class="flex flex-wrap gap-1.5">
          <UBadge
            :color="exercise.isGlobal ? 'neutral' : 'primary'"
            :variant="exercise.isGlobal ? 'subtle' : 'solid'"
            size="sm"
          >
            {{ exercise.isGlobal ? 'Global' : 'Custom' }}
          </UBadge>
          <UBadge variant="subtle" size="sm">
            {{ formatEnum(exercise.trackingType) }}
          </UBadge>
          <UBadge v-if="exercise.equipment" color="neutral" variant="subtle" size="sm">
            {{ formatEnum(exercise.equipment) }}
          </UBadge>
          <UBadge v-if="exercise.movementPattern" color="neutral" variant="subtle" size="sm">
            {{ formatEnum(exercise.movementPattern) }}
          </UBadge>
        </div>

        <!-- Muscle Groups -->
        <div v-if="exercise.muscleGroups.length > 0">
          <h3 class="text-sm font-medium text-muted mb-2">
            Muscle Groups
          </h3>
          <ExercisesExerciseMuscleMap :highlighted-muscles="exercise.muscleGroups" />
        </div>

        <!-- Instructions -->
        <div v-if="exercise.instructions.length">
          <h3 class="text-sm font-medium text-muted mb-2">
            Instructions
          </h3>
          <ol class="list-decimal list-inside text-sm space-y-1.5">
            <li v-for="(step, i) in exercise.instructions" :key="i">
              {{ step }}
            </li>
          </ol>
        </div>
      </div>
    </template>

    <template v-if="exercise && !exercise.isGlobal" #footer>
      <div class="flex gap-3">
        <UButton
          label="Edit"
          icon="i-lucide-pencil"
          variant="outline"
          @click="emit('edit', exercise)"
        />
        <UButton
          label="Delete"
          icon="i-lucide-trash-2"
          color="error"
          variant="outline"
          @click="emit('delete', exercise)"
        />
      </div>
    </template>
  </USlideover>
</template>
