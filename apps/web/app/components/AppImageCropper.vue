<script setup lang="ts">
/**
 * Reusable image cropper modal. Takes a File, opens a cropper with the
 * configured stencil, and emits a cropped Blob on save.
 *
 * Usage:
 *   <AppImageCropper
 *     v-model:open="cropperOpen"
 *     :file="pendingFile"
 *     shape="circle"
 *     :aspect-ratio="1"
 *     mime-type="image/jpeg"
 *     :quality="0.9"
 *     @cropped="onCropped"
 *   />
 */
import { Cropper, CircleStencil, RectangleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

const props = withDefaults(defineProps<{
  file: File | null
  shape?: 'circle' | 'rectangle'
  aspectRatio?: number
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp'
  quality?: number
  title?: string
}>(), {
  shape: 'circle',
  aspectRatio: 1,
  mimeType: 'image/jpeg',
  quality: 0.9,
  title: 'Adjust photo'
})

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  cropped: [blob: Blob, dataUrl: string]
}>()

const imageSrc = ref<string | null>(null)
const cropperRef = ref<InstanceType<typeof Cropper> | null>(null)
const saving = ref(false)

const stencil = computed(() =>
  props.shape === 'circle' ? CircleStencil : RectangleStencil
)

// Create object URL when file changes
watch(
  () => props.file,
  (file) => {
    // Revoke previous URL
    if (imageSrc.value) {
      URL.revokeObjectURL(imageSrc.value)
      imageSrc.value = null
    }
    if (file) {
      imageSrc.value = URL.createObjectURL(file)
    }
  },
  { immediate: true }
)

// Cleanup on unmount
onBeforeUnmount(() => {
  if (imageSrc.value) URL.revokeObjectURL(imageSrc.value)
})

async function onSave() {
  if (!cropperRef.value) return
  const result = cropperRef.value.getResult()
  if (!result?.canvas) return

  saving.value = true
  try {
    const canvas = result.canvas
    const blob: Blob | null = await new Promise(resolve =>
      canvas.toBlob(resolve, props.mimeType, props.quality)
    )
    if (!blob) return
    const dataUrl = canvas.toDataURL(props.mimeType, props.quality)
    emit('cropped', blob, dataUrl)
    open.value = false
  } finally {
    saving.value = false
  }
}

function onCancel() {
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" :title="title" :ui="{ content: 'max-w-2xl' }">
    <template #body>
      <div v-if="imageSrc" class="h-[60vh] max-h-[480px] bg-elevated rounded-md overflow-hidden">
        <Cropper
          ref="cropperRef"
          :src="imageSrc"
          :stencil-component="stencil"
          :stencil-props="{ aspectRatio, movable: true, resizable: true }"
          image-restriction="stencil"
          class="h-full"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton label="Cancel" variant="ghost" @click="onCancel" />
        <UButton label="Save" :loading="saving" @click="onSave" />
      </div>
    </template>
  </UModal>
</template>

<style>
/* Tailwind/Nuxt UI theme hooks for the cropper */
.vue-advanced-cropper__background,
.vue-advanced-cropper__foreground {
  background: transparent;
}
</style>
