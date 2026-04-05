<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import type { ChartStatsResponse } from '@workout/shared'

const props = defineProps<{
  data: ChartStatsResponse | null
  loading: boolean
}>()

const emit = defineEmits<{
  'update:metric': [metric: string]
  'update:range': [range: string]
}>()

const metric = ref('duration')
const range = ref('12w')

const metricTabs = [
  { label: 'Duration', value: 'duration' },
  { label: 'Reps', value: 'reps' }
]

const rangeOptions = [
  { label: 'Last 12 weeks', value: '12w' },
  { label: '1 year', value: '1y' },
  { label: 'All Time', value: 'all' }
]

function onMetricChange(val: string) {
  metric.value = val
  emit('update:metric', val)
}

function onRangeChange(val: string) {
  range.value = val
  emit('update:range', val)
}

// ── Summary line ("1h 30min This week") ──
const periodLabel = computed(() => {
  switch (range.value) {
    case '1y': return 'This year'
    case 'all': return 'All time'
    default: return 'This week'
  }
})

const summaryText = computed(() => {
  if (!props.data) return ''
  // For "This week", use the last bucket value; for year/all, use periodTotal
  const val = range.value === '12w'
    ? (props.data.buckets?.at(-1)?.value ?? 0)
    : (props.data.periodTotal ?? 0)

  if (metric.value === 'duration') {
    return formatHours(val)
  }
  return val.toLocaleString()
})

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0 && m === 0) return '0min'
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

// ── Chart data ──
const chartData = computed(() => {
  if (!props.data?.buckets?.length) {
    return { labels: [], datasets: [] }
  }

  const labels = props.data.buckets.map((b) => {
    const d = new Date(b.start)
    if (range.value === '12w') {
      // Weekly: "Dec 21", "Jan 04"
      return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
    }
    if (range.value === '1y') {
      // Monthly: "Apr", "May"
      return d.toLocaleDateString('en-US', { month: 'short' })
    }
    // All time: "Aug 2022", "Feb 2023"
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  })

  const values = props.data.buckets.map(b => b.value)

  return {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: 'rgb(59, 130, 246)',
        borderRadius: 3,
        barPercentage: 0.75,
        categoryPercentage: 0.85
      }
    ]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { parsed: { y: number } }) => {
          const val = ctx.parsed.y
          if (metric.value === 'duration') return formatHours(val)
          return `${val.toLocaleString()} reps`
        }
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: {
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: range.value === 'all' ? 8 : range.value === '1y' ? 12 : 7,
        font: { size: 11 }
      }
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: {
        drawBorder: false,
        color: 'rgba(128, 128, 128, 0.15)',
        drawTicks: false
      },
      ticks: {
        font: { size: 11 },
        padding: 8,
        callback: (value: number) => {
          if (metric.value === 'duration') {
            return `${Math.round(value)} hrs`
          }
          if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
          return value
        }
      }
    }
  }
}))
</script>

<template>
  <UCard>
    <!-- Header: Title -->
    <h3 class="text-base font-semibold mb-3">
      Statistics
    </h3>

    <!-- Metric tabs (underline style) -->
    <div class="flex gap-4 border-b border-default mb-4">
      <button
        v-for="tab in metricTabs"
        :key="tab.value"
        class="pb-2 text-sm font-medium transition-colors relative"
        :class="metric === tab.value
          ? 'text-primary'
          : 'text-muted hover:text-default'"
        @click="onMetricChange(tab.value)"
      >
        {{ tab.label }}
        <span
          v-if="metric === tab.value"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t"
        />
      </button>
    </div>

    <!-- Summary + Range selector -->
    <div class="flex items-baseline justify-between mb-4">
      <div class="flex items-baseline gap-2">
        <span class="text-2xl font-bold">{{ summaryText }}</span>
        <span class="text-sm text-muted">{{ periodLabel }}</span>
      </div>
      <USelect
        :model-value="range"
        :items="rangeOptions"
        value-key="value"
        size="sm"
        class="w-36"
        @update:model-value="onRangeChange"
      />
    </div>

    <!-- Chart area -->
    <template v-if="loading">
      <div class="h-52 flex items-center justify-center">
        <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
      </div>
    </template>
    <AppEmptyState
      v-else-if="!data?.buckets?.length"
      icon="i-lucide-bar-chart-3"
      title="No workout data yet"
      description="Complete some workouts to see your stats."
    />
    <template v-else>
      <div class="h-52">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </template>
  </UCard>
</template>
