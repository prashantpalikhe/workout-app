<script setup lang="ts">
import type { AthleteProfile } from '~/stores/profile'

const props = defineProps<{
  profile: AthleteProfile | null
}>()

const open = defineModel<boolean>('open', { default: false })

const authStore = useAuthStore()
const profileStore = useProfileStore()
const toast = useToast()

const saving = ref(false)
const avatarUploading = ref(false)
const avatarRemoving = ref(false)
const pendingAvatarFile = ref<File | null>(null)
const avatarPreviewUrl = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const form = reactive({
  firstName: '',
  lastName: '',
  bio: '',
  link: '',
  dateOfBirth: '',
  gender: '',
  weight: null as number | null,
  height: null as number | null
})

const genderOptions = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Other', value: 'OTHER' },
  { label: 'Prefer not to say', value: 'PREFER_NOT_TO_SAY' }
]

const initials = computed(() => {
  const f = authStore.user?.firstName?.charAt(0) ?? ''
  const l = authStore.user?.lastName?.charAt(0) ?? ''
  return `${f}${l}` || '?'
})

// The avatar to display: preview of pending file > current user avatar
const displayAvatarSrc = computed(() => {
  if (avatarPreviewUrl.value) return avatarPreviewUrl.value
  return authStore.user?.avatarUrl || undefined
})

// Populate form when modal opens
watch(open, (val) => {
  if (val) {
    form.firstName = authStore.user?.firstName ?? ''
    form.lastName = authStore.user?.lastName ?? ''
    form.bio = props.profile?.bio ?? ''
    form.link = props.profile?.link ?? ''
    form.dateOfBirth = props.profile?.dateOfBirth?.substring(0, 10) ?? ''
    form.gender = props.profile?.gender ?? ''
    form.weight = props.profile?.weight ?? null
    form.height = props.profile?.height ?? null
    // Reset avatar state
    pendingAvatarFile.value = null
    avatarPreviewUrl.value = null
  }
})

function triggerFileInput() {
  fileInputRef.value?.click()
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // Validate file size (5 MB)
  if (file.size > 5 * 1024 * 1024) {
    toast.add({ title: 'Image must be under 5 MB', color: 'error' })
    input.value = ''
    return
  }

  pendingAvatarFile.value = file
  avatarPreviewUrl.value = URL.createObjectURL(file)

  // Reset input so the same file can be re-selected
  input.value = ''
}

function clearPendingAvatar() {
  if (avatarPreviewUrl.value) {
    URL.revokeObjectURL(avatarPreviewUrl.value)
  }
  pendingAvatarFile.value = null
  avatarPreviewUrl.value = null
}

async function removeAvatar() {
  avatarRemoving.value = true
  try {
    await profileStore.removeAvatar()
    clearPendingAvatar()
    toast.add({ title: 'Photo removed', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to remove photo', color: 'error' })
  } finally {
    avatarRemoving.value = false
  }
}

async function save() {
  saving.value = true
  try {
    // Upload avatar if a new file is pending
    if (pendingAvatarFile.value) {
      avatarUploading.value = true
      try {
        await profileStore.uploadAvatar(pendingAvatarFile.value)
        clearPendingAvatar()
      } finally {
        avatarUploading.value = false
      }
    }

    // Update user (firstName, lastName)
    const userChanges: Record<string, unknown> = {}
    if (form.firstName !== authStore.user?.firstName) userChanges.firstName = form.firstName
    if (form.lastName !== authStore.user?.lastName) userChanges.lastName = form.lastName

    if (Object.keys(userChanges).length > 0) {
      await profileStore.updateUser(userChanges)
      // Update local auth store
      if (authStore.user) {
        if (userChanges.firstName) authStore.user.firstName = userChanges.firstName as string
        if (userChanges.lastName) authStore.user.lastName = userChanges.lastName as string
      }
    }

    // Update profile (bio, link, dob, gender, weight, height)
    // Send null for cleared fields so the backend can unset them
    await profileStore.updateProfile({
      bio: form.bio || null,
      link: form.link || null,
      dateOfBirth: form.dateOfBirth || null,
      gender: form.gender || null,
      weight: form.weight ?? null,
      height: form.height ?? null
    })

    toast.add({ title: 'Profile updated', color: 'success' })
    open.value = false
  } catch {
    toast.add({ title: 'Failed to update profile', color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #header>
      <h3 class="text-lg font-semibold">
        Edit Profile
      </h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <!-- Avatar -->
        <div class="flex items-center gap-4">
          <div class="relative group">
            <UAvatar
              :src="displayAvatarSrc"
              :text="initials"
              size="xl"
              class="ring-2 ring-default"
            />
            <!-- Overlay on hover -->
            <button
              type="button"
              class="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              @click="triggerFileInput"
            >
              <UIcon name="i-lucide-camera" class="size-5 text-white" />
            </button>
          </div>

          <div class="flex flex-col gap-1">
            <button
              type="button"
              class="text-sm text-primary hover:underline text-left cursor-pointer"
              @click="triggerFileInput"
            >
              Change photo
            </button>
            <button
              v-if="authStore.user?.avatarUrl || pendingAvatarFile"
              type="button"
              class="text-sm text-error hover:underline text-left cursor-pointer"
              :disabled="avatarRemoving"
              @click="pendingAvatarFile ? clearPendingAvatar() : removeAvatar()"
            >
              {{ avatarRemoving ? 'Removing...' : 'Remove photo' }}
            </button>
          </div>

          <!-- Hidden file input -->
          <input
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            class="hidden"
            @change="onFileSelected"
          >
        </div>

        <div class="grid grid-cols-2 gap-3">
          <UFormField label="First Name">
            <UInput v-model="form.firstName" placeholder="First name" />
          </UFormField>
          <UFormField label="Last Name">
            <UInput v-model="form.lastName" placeholder="Last name" />
          </UFormField>
        </div>

        <UFormField label="Bio">
          <UTextarea
            v-model="form.bio"
            placeholder="Tell us about yourself..."
            :rows="3"
            autoresize
          />
        </UFormField>

        <UFormField label="Link">
          <UInput
            v-model="form.link"
            placeholder="https://..."
            icon="i-lucide-link"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Date of Birth">
            <UInput v-model="form.dateOfBirth" type="date" />
          </UFormField>
          <UFormField label="Gender">
            <USelect
              v-model="form.gender"
              :items="genderOptions"
              value-key="value"
              placeholder="Select..."
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Weight (kg)">
            <UInput
              v-model.number="form.weight"
              type="number"
              placeholder="75"
              :min="20"
              :max="300"
            />
          </UFormField>
          <UFormField label="Height (cm)">
            <UInput
              v-model.number="form.height"
              type="number"
              placeholder="175"
              :min="100"
              :max="250"
            />
          </UFormField>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          variant="ghost"
          @click="open = false"
        />
        <UButton
          label="Save"
          :loading="saving"
          @click="save"
        />
      </div>
    </template>
  </UModal>
</template>
