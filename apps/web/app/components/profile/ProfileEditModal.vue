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

const form = reactive({
  firstName: '',
  lastName: '',
  bio: '',
  link: '',
  dateOfBirth: '',
  gender: '',
  weight: null as number | null,
  height: null as number | null,
})

const genderOptions = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Other', value: 'OTHER' },
  { label: 'Prefer not to say', value: 'PREFER_NOT_TO_SAY' },
]

// Populate form when modal opens
watch(open, (val) => {
  if (val) {
    form.firstName = authStore.user?.firstName ?? ''
    form.lastName = authStore.user?.lastName ?? ''
    form.bio = props.profile?.bio ?? ''
    form.link = props.profile?.link ?? ''
    form.dateOfBirth = props.profile?.dateOfBirth ?? ''
    form.gender = props.profile?.gender ?? ''
    form.weight = props.profile?.weight ?? null
    form.height = props.profile?.height ?? null
  }
})

async function save() {
  saving.value = true
  try {
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
    await profileStore.updateProfile({
      bio: form.bio || null,
      link: form.link || null,
      dateOfBirth: form.dateOfBirth || null,
      gender: form.gender || null,
      weight: form.weight,
      height: form.height,
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
      <h3 class="text-lg font-semibold">Edit Profile</h3>
    </template>

    <template #body>
      <div class="space-y-4">
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
