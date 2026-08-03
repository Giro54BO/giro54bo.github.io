<script lang="ts">
  import { alertas } from '$lib/data/trips';
  const alertaTypeLabels: Record<string, string> = {
    critico: 'Crítico', retraso: 'Retraso', parada: 'Parada obligatoria', desvio: 'Desvío de ruta',
  };
</script>

<div class="incidencias" id="main-content">
  <div class="page-header">
    <h2 class="section-heading">
      <span class="icon section-heading__icon" aria-hidden="true">warning</span>
      Incidencias
    </h2>
    <a href="/incidencias/nueva" class="btn-outline">Registrar incidencia <span class="icon" aria-hidden="true">add</span></a>
  </div>

  {#if alertas.length === 0}
    <div class="alerts-empty">
      <span class="icon icon--xl" aria-hidden="true">check_circle</span>
      <p>Sin alertas activas</p>
    </div>
  {:else}
    <ul class="alerts-grid" role="list">
      {#each alertas as alerta (alerta.id)}
        <li class="alert-card" role="article">
          <div class="alert-card__header">
            <span class="alert-card__type">{alertaTypeLabels[alerta.tipo]}</span>
            <span class="alert-card__unit">{alerta.tripId}</span>
          </div>
          <p class="alert-card__message">{alerta.mensaje}</p>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  /* small page overrides */
</style>
