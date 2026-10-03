import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ThreatOrigin } from '../models/dashboard.models';
// Original schematic silhouettes, equirectangular coordinates; no third-party geographic data.
@Component({
  selector: 'app-threat-origins',
  imports: [DecimalPipe],
  template: `<svg
      viewBox="0 0 720 360"
      role="img"
      aria-label="Schematic world map with fictional threat origins. Values are listed below."
    >
      <defs>
        <pattern id="map-grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M60 0H0V60" class="grid" />
        </pattern>
      </defs>
      <rect width="720" height="360" fill="url(#map-grid)" />
      <g class="land">
        <path
          d="M55 82 92 55 150 38 193 57 213 85 183 109 169 142 186 163 207 176 198 185 171 169 143 149 135 182 111 168 98 131 70 117Z M211 180 244 174 268 184 299 196 308 219 287 245 270 264 256 293 242 310 232 299 226 271 218 245 203 218Z M302 89 330 70 353 77 370 63 404 70 426 52 505 47 566 69 637 81 665 104 633 132 591 140 583 160 574 182 563 183 548 157 524 163 503 139 482 166 453 158 434 129 405 126 389 109 366 122 339 108Z M337 129 380 134 413 167 401 204 379 242 359 252 342 218 328 174Z M552 247 591 228 625 236 649 264 632 282 578 285 549 268Z M217 28 254 17 277 38 254 70 224 60Z"
        />
      </g>
      @for (origin of origins(); track origin.country) {
        <g>
          <title>{{ origin.country }}: {{ origin.count }} detections</title>
          <circle
            class="halo"
            [attr.cx]="x(origin)"
            [attr.cy]="y(origin)"
            [attr.r]="10 + (origin.count / maximum()) * 12"
          />
          <circle class="hotspot" [attr.cx]="x(origin)" [attr.cy]="y(origin)" r="4" />
        </g>
      }
    </svg>
    <ol>
      @for (origin of origins(); track origin.country) {
        <li>
          <span>{{ origin.country }}</span
          ><strong>{{ origin.count | number }}</strong>
        </li>
      }
    </ol>`,
  styles: `
    :host {
      display: block;
    }
    svg {
      width: 100%;
      height: auto;
      display: block;
      margin-block: 0.5rem 1rem;
    }
    .grid {
      fill: none;
      stroke: var(--sentinel-border);
      stroke-width: 0.5;
    }
    .land {
      fill: var(--sentinel-surface-hover);
      stroke: var(--sentinel-border-strong);
      stroke-width: 1;
    }
    .halo {
      fill: var(--sentinel-primary);
      opacity: 0.15;
    }
    .hotspot {
      fill: var(--sentinel-primary);
      stroke: var(--sentinel-surface);
      stroke-width: 1.5;
    }
    ol {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem 1.5rem;
      padding-left: 1.25rem;
      margin: 0;
      font-size: 0.8125rem;
    }
    li {
      padding-left: 0.25rem;
    }
    li::marker {
      color: var(--sentinel-text-muted);
    }
    li span {
      color: var(--sentinel-text-secondary);
    }
    strong {
      float: right;
      font-variant-numeric: tabular-nums;
    }
    @media (max-width: 500px) {
      ol {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ThreatOrigins {
  readonly origins = input.required<readonly ThreatOrigin[]>();
  readonly maximum = computed(() => Math.max(1, ...this.origins().map((origin) => origin.count)));
  x(origin: ThreatOrigin): number {
    return (origin.longitude + 180) * 2;
  }
  y(origin: ThreatOrigin): number {
    return (90 - origin.latitude) * 2;
  }
}
