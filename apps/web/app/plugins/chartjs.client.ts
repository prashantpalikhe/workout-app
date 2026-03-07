import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'

export default defineNuxtPlugin(() => {
  Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)
})
