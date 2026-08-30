'use client';

import { useState } from 'react';
import { zonesByArea } from '../../lib/route';
import { IconSwap, IconPin, IconClock } from '../Icons';

/**
 * Buscador con forma de app de viaje: origen y destino apilados,
 * unidos por una línea vertical con dos puntos — el patrón que usan
 * Uber, Yummy y Ridery para que se lea como un trayecto y no como
 * un formulario.
 */
export default function SearchForm({
  origin,
  destination,
  date,
  sort,
  suggestedFare,
  km,
}: {
  origin: string;
  destination: string;
  date: string;
  sort: string;
  suggestedFare?: number | null;
  km?: number | null;
}) {
  const [o, setO] = useState(origin);
  const [d, setD] = useState(destination);
  const [open, setOpen] = useState(false);
  const areas = zonesByArea();

  function swap() {
    setO(d);
    setD(o);
  }

  const options = Object.entries(areas).map(([area, zones]) => (
    <optgroup key={area} label={area}>
      {zones.map((z) => (
        <option key={z.id} value={z.name}>{z.name}</option>
      ))}
    </optgroup>
  ));

  return (
    <form className="trip-search" method="get">
      {/* Trayecto: dos campos unidos por la línea */}
      <div className="route-input">
        <div className="route-rail" aria-hidden="true">
          <span className="rail-dot origin" />
          <span className="rail-line" />
          <span className="rail-dot dest" />
        </div>

        <div className="route-fields">
          <div className="rf">
            <label htmlFor="origin">¿De dónde sales?</label>
            <select
              id="origin"
              name="origin"
              value={o}
              onChange={(e) => setO(e.target.value)}
            >
              {options}
            </select>
          </div>

          <div className="rf-divider" />

          <div className="rf">
            <label htmlFor="destination">¿Para dónde vas?</label>
            <select
              id="destination"
              name="destination"
              value={d}
              onChange={(e) => setD(e.target.value)}
            >
              {options}
            </select>
          </div>
        </div>

        <button
          type="button"
          className="route-swap"
          onClick={swap}
          aria-label="Invertir origen y destino"
          title="Invertir"
        >
          <IconSwap size={18} />
        </button>
      </div>

      {/* Fecha siempre visible; el resto se despliega */}
      <div className="search-row">
        <div className="sr-field">
          <IconClock size={17} />
          <input id="date" name="date" type="date" defaultValue={date} />
        </div>
        <button
          type="button"
          className={`sr-toggle ${open ? 'on' : ''}`}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          Filtros
        </button>
      </div>

      {open && (
        <div className="search-extra">
          <label htmlFor="sort">Ordenar por</label>
          <select id="sort" name="sort" defaultValue={sort}>
            <option value="hora">Hora de salida</option>
            <option value="precio">Precio más bajo</option>
            <option value="rating">Mejor calificación</option>
          </select>
        </div>
      )}
      {!open && <input type="hidden" name="sort" value={sort} />}

      {suggestedFare != null && km != null && (
        <div className="fare-hint">
          <IconPin size={15} />
          <span>
            {km} km · tarifa referencia{' '}
            <strong>${suggestedFare.toFixed(2)}</strong> el puesto
          </span>
        </div>
      )}

      <button className="btn btn-lg" type="submit">
        Buscar puesto
      </button>
    </form>
  );
}
