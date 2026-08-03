<script lang="ts">
  import { alertas, ALERTA_TYPE_ICONS, ALERTA_TYPE_LABELS, trips } from '$lib/data/trips';
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
        {@const linkedTrip = alerta.tripId ? trips.find((trip) => trip.id === alerta.tripId) : null}
        {#snippet incidentBody()}
          <div class="alert-card__header">
            <span class="alert-card__type alert-card__type--{alerta.tipo}">
              <span class="icon icon--sm" aria-hidden="true">{ALERTA_TYPE_ICONS[alerta.tipo]}</span>
              {ALERTA_TYPE_LABELS[alerta.tipo]}
            </span>
            {#if linkedTrip}
              <span class="alert-card__unit">{linkedTrip.id}</span>
            {:else}
              <span class="alert-card__unit alert-card__unit--global">
                <span class="icon icon--sm" aria-hidden="true">public</span>
                Global
              </span>
            {/if}
          </div>
          <p class="alert-card__message">{alerta.mensaje}</p>
          <div class="alert-card__footer">
            <span class="alert-card__time">{alerta.tiempo}</span>
            {#if linkedTrip}
              <span class="alert-card__action">
                VER VIAJE
                <span class="icon" aria-hidden="true">arrow_forward</span>
              </span>
            {/if}
          </div>
        {/snippet}

        {#if linkedTrip}
          <a
            class="alert-card alert-card--linked"
            href={`/viajes/${linkedTrip.id}`}
            aria-label={`Incidencia ${ALERTA_TYPE_LABELS[alerta.tipo]} en el viaje ${linkedTrip.id}. Ver viaje.`}
          >
            {@render incidentBody()}
          </a>
        {:else}
          <div class="alert-card" role="article">
            {@render incidentBody()}
          </div>
        {/if}
      {/each}
    </ul>
  {/if}
</div>

<style>
  /* small page overrides */
</style>
