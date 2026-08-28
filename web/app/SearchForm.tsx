'use client';

import { useState } from 'react';
import { zonesByArea } from '../lib/route';

export default function SearchForm({
  origin,
  destination,
  date,
  sort,
}: {
  origin: string;
  destination: string;
  date: string;
  sort: string;
}) {
  const [o, setO] = useState(origin);
  const [d, setD] = useState(destination);
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
    <form className="card search-form" method="get">
      <div className="field">
        <label htmlFor="origin">¿De dónde sales?</label>
        <select id="origin" name="origin" value={o} onChange={(e) => setO(e.target.value)}>
          {options}
        </select>
      </div>

      <div className="swap-wrap">
        <button type="button" className="swap-btn" onClick={swap}
          aria-label="Invertir origen y destino" title="Invertir">
          ⇅
        </button>
      </div>

      <div className="field">
        <label htmlFor="destination">¿Para dónde vas?</label>
        <select id="destination" name="destination" value={d} onChange={(e) => setD(e.target.value)}>
          {options}
        </select>
      </div>

      <div className="field">
        <label htmlFor="date">¿Cuándo?</label>
        <input id="date" name="date" type="date" defaultValue={date} />
      </div>

      <div className="field">
        <label htmlFor="sort">Ordenar por</label>
        <select id="sort" name="sort" defaultValue={sort}>
          <option value="hora">Hora de salida</option>
          <option value="precio">Precio más bajo</option>
          <option value="rating">Mejor calificación</option>
        </select>
      </div>

      <div className="field full">
        <button className="btn" type="submit">Buscar puesto</button>
      </div>
    </form>
  );
}
