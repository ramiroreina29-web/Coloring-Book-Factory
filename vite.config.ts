import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno según el modo (development/production)
  // Usar '.' es equivalente a process.cwd() en este contexto y evita errores de tipo si @types/node falta
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // Polyfill para process.env.API_KEY asegurando que esté disponible en el navegador
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY)
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      // Aumentar el límite de advertencia de tamaño de chunk
      chunkSizeWarningLimit: 1000,
    }
  };
});