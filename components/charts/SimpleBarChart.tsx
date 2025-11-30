import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
);

type Props = {
  labels: string[];
  data: number[];
  variant?: 'bar' | 'line';
  label?: string;
};

export function SimpleChart({ labels, data, variant = 'bar', label }: Props) {
  const dataset = {
    labels,
    datasets: [
      {
        label: label ?? 'Totals',
        data,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.4)',
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  };

  return variant === 'bar' ? (
    <Bar data={dataset} options={{ responsive: true, color: '#fff' }} />
  ) : (
    <Line data={dataset} options={{ responsive: true, color: '#fff' }} />
  );
}

