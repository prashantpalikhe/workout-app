<script setup lang="ts">
import { Line } from 'vue-chartjs'
import type { ExerciseStatsResponse, ExerciseStatsDataPoint } from '@workout/shared'

const props = defineProps<{
  data: ExerciseStatsResponse | null
  loading: boolean
  trackingType: string
}>()

const emit = defineEmits<{
  'update:range': [range: string]
}>()

const { formatWeightValue, weightUnit } = useUnits()

// Keys that carry kg values from the server and need unit conversion at the
// display boundary. `maxReps` is unit-agnostic and stays as-is.
const WEIGHT_KEYS = new Set<keyof ExerciseStatsDataPoint>([
  'maxWeight',
  'estimated1RM',
  'totalVolume'
])

const range = ref('12w')
const rangeOptions = [
  { label: 'Last 12 weeks', value: '12w' },
  { label: '1 year', value: '1y' },
  { label: 'All Time', value: 'all' }
]

function onRangeChange(val: string) {
  range.value = val
  emit('update:range', val)
}

// Which charts to show based on tracking type
const charts = computed(() => {
  const list: { title: string, key: keyof ExerciseStatsDataPoint, unit: string, color: string }[] = []
  const w = weightUnit.value

  if (['WEIGHT_REPS', 'WEIGHT_DURATION'].includes(props.trackingType)) {
    list.push({ title: 'Weight', key: 'maxWeight', unit: w, color: 'rgb(59, 130, 246)' })
  }
  if (props.trackingType === 'WEIGHT_REPS') {
    list.push({ title: 'Estimated One Rep Max', key: 'estimated1RM', unit: w, color: 'rgb(234, 179, 8)' })
    list.push({ title: 'Set Volume', key: 'totalVolume', unit: w, color: 'rgb(34, 197, 94)' })
  }
  if (['WEIGHT_REPS', 'REPS_ONLY'].includes(props.trackingType)) {
    list.push({ title: 'Max Reps', key: 'maxReps', unit: 'reps', color: 'rgb(168, 85, 247)' })
  }

  return list
})

const labels = computed(() => {
  if (!props.data?.dataPoints?.length) return []
  return props.data.dataPoints.map((dp) => {
    const d = new Date(dp.date)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })
})

function buildChartData(key: keyof ExerciseStatsDataPoint, color: string) {
  const convert = WEIGHT_KEYS.has(key)
    ? (v: number | null) => formatWeightValue(v)
    : (v: number | null) => v
  return {
    labels: labels.value,
    datasets: [
      {
        data: props.data?.dataPoints?.map(dp => convert(dp[key])) ?? [],
        borderColor: color,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
        tension: 0.3,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 5
      }
    ]
  }
}

function buildChartOptions(unit: string) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { y: number } }) => {
            const val = ctx.parsed.y
            if (unit === 'reps') return `${val} reps`
            return `${val?.toLocaleString()} ${unit}`
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8, font: { size: 11 } }
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: 'rgba(128, 128, 128, 0.15)', drawTicks: false },
        ticks: {
          font: { size: 11 },
          padding: 8,
          callback: (value: number) => {
            if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
            return value
          }
        }
      }
    }
  }
}
</script>

<template>
  <div>
    <!-- Loading -->
    <template v-if="loading">
      <div class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
      </div>
    </template>

    <!-- No data -->
    <AppEmptyState
      v-else-if="!data?.dataPoints?.length"
      icon="i-lucide-bar-chart-3"
      title="No statistics yet"
      description="Complete workouts with this exercise to see trends."
    />

    <!-- Separate charts per metric -->
    <template v-else>
      <!-- Range selector -->
      <div class="flex justify-end mb-4">
        <USelect
          :model-value="range"
          :items="rangeOptions"
          value-key="value"
          size="sm"
          class="w-36"
          @update:model-value="onRangeChange"
        />
      </div>

      <div class="space-y-6">
        <div v-for="chart in charts" :key="chart.key">
          <h4 class="text-sm font-semibold mb-2">
            {{ chart.title }}
          </h4>
          <div class="h-48">
            <Line
              :data="buildChartData(chart.key, chart.color)"
              :options="buildChartOptions(chart.unit)"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
