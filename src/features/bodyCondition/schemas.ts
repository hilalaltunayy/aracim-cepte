import { BodyType } from '@/domain/entities';

export interface PartHitArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BodyPartSchema {
  key: string;
  label: string;
  path: string;
  hitArea: PartHitArea;
}

export interface VehicleBodySchema {
  type: BodyType;
  silhouettePath: string;
  windshieldPath: string;
  rearWindowPath: string;
  parts: BodyPartSchema[];
}

const sedanParts: BodyPartSchema[] = [
  {
    key: 'front_bumper',
    label: 'Ön tampon',
    path: 'M78 27 Q130 7 182 27 L179 49 Q130 37 81 49 Z',
    hitArea: { x: 72, y: 10, width: 116, height: 46 },
  },
  {
    key: 'hood',
    label: 'Kaput',
    path: 'M81 51 Q130 38 179 51 L172 116 Q130 103 88 116 Z',
    hitArea: { x: 78, y: 48, width: 104, height: 72 },
  },
  {
    key: 'left_front_fender',
    label: 'Sol ön çamurluk',
    path: 'M78 51 L88 116 L79 162 L47 162 L50 118 Q53 87 68 63 Z',
    hitArea: { x: 44, y: 50, width: 46, height: 114 },
  },
  {
    key: 'right_front_fender',
    label: 'Sağ ön çamurluk',
    path: 'M182 51 L172 116 L181 162 L213 162 L210 118 Q207 87 192 63 Z',
    hitArea: { x: 170, y: 50, width: 46, height: 114 },
  },
  {
    key: 'left_front_door',
    label: 'Sol ön kapı',
    path: 'M47 164 L84 164 L84 236 L44 236 Z',
    hitArea: { x: 42, y: 160, width: 45, height: 79 },
  },
  {
    key: 'right_front_door',
    label: 'Sağ ön kapı',
    path: 'M176 164 L213 164 L216 236 L176 236 Z',
    hitArea: { x: 173, y: 160, width: 45, height: 79 },
  },
  {
    key: 'left_rear_door',
    label: 'Sol arka kapı',
    path: 'M44 239 L84 239 L84 311 L47 311 Z',
    hitArea: { x: 42, y: 237, width: 45, height: 77 },
  },
  {
    key: 'right_rear_door',
    label: 'Sağ arka kapı',
    path: 'M176 239 L216 239 L213 311 L176 311 Z',
    hitArea: { x: 173, y: 237, width: 45, height: 77 },
  },
  {
    key: 'roof',
    label: 'Tavan',
    path: 'M90 120 Q130 105 170 120 L174 294 Q130 312 86 294 Z',
    hitArea: { x: 84, y: 116, width: 92, height: 184 },
  },
  {
    key: 'left_rear_quarter',
    label: 'Sol arka çamurluk',
    path: 'M47 314 L84 314 L80 378 L67 367 Q52 349 47 314 Z',
    hitArea: { x: 44, y: 310, width: 42, height: 72 },
  },
  {
    key: 'right_rear_quarter',
    label: 'Sağ arka çamurluk',
    path: 'M176 314 L213 314 Q208 349 193 367 L180 378 Z',
    hitArea: { x: 174, y: 310, width: 42, height: 72 },
  },
  {
    key: 'trunk',
    label: 'Bagaj kapağı',
    path: 'M84 308 Q130 324 176 308 L180 378 Q130 397 80 378 Z',
    hitArea: { x: 79, y: 304, width: 102, height: 78 },
  },
  {
    key: 'rear_bumper',
    label: 'Arka tampon',
    path: 'M79 381 Q130 401 181 381 L184 404 Q130 425 76 404 Z',
    hitArea: { x: 72, y: 378, width: 116, height: 45 },
  },
];

const suvParts: BodyPartSchema[] = sedanParts.map((part) =>
  part.key === 'roof'
    ? {
        ...part,
        path: 'M86 115 Q130 99 174 115 L178 301 Q130 319 82 301 Z',
        hitArea: { x: 80, y: 110, width: 100, height: 197 },
      }
    : part.key === 'trunk'
      ? {
          ...part,
          key: 'tailgate',
          label: 'Bagaj kapağı',
          path: 'M82 304 Q130 318 178 304 L182 381 Q130 400 78 381 Z',
          hitArea: { x: 76, y: 300, width: 108, height: 84 },
        }
      : part,
);

const pickupParts: BodyPartSchema[] = [
  ...sedanParts.filter((part) =>
    [
      'front_bumper',
      'hood',
      'left_front_fender',
      'right_front_fender',
      'left_front_door',
      'right_front_door',
    ].includes(part.key),
  ),
  {
    key: 'roof',
    label: 'Tavan',
    path: 'M88 118 Q130 102 172 118 L174 220 Q130 235 86 220 Z',
    hitArea: { x: 84, y: 114, width: 92, height: 112 },
  },
  {
    key: 'cargo_bed',
    label: 'Kasa',
    path: 'M57 236 Q130 226 203 236 L202 374 Q130 391 58 374 Z',
    hitArea: { x: 54, y: 230, width: 152, height: 150 },
  },
  {
    key: 'tailgate',
    label: 'Arka kapak',
    path: 'M59 377 Q130 394 201 377 L201 400 Q130 416 59 400 Z',
    hitArea: { x: 55, y: 372, width: 150, height: 34 },
  },
  {
    key: 'rear_bumper',
    label: 'Arka tampon',
    path: 'M76 403 Q130 419 184 403 L184 420 L76 420 Z',
    hitArea: { x: 72, y: 398, width: 116, height: 30 },
  },
];

export const bodySchemas: Record<BodyType, VehicleBodySchema> = {
  sedan_hatchback: {
    type: 'sedan_hatchback',
    silhouettePath:
      'M87 18 Q130 4 173 18 Q187 29 191 62 L198 92 Q211 112 214 145 L218 319 Q214 349 198 370 L190 402 Q130 428 70 402 L62 370 Q46 349 42 319 L46 145 Q49 112 62 92 L69 62 Q73 29 87 18 Z',
    windshieldPath: 'M89 117 Q130 101 171 117 L166 151 Q130 141 94 151 Z',
    rearWindowPath: 'M88 282 Q130 298 172 282 L176 307 Q130 320 84 307 Z',
    parts: sedanParts,
  },
  suv_crossover: {
    type: 'suv_crossover',
    silhouettePath:
      'M83 15 Q130 1 177 15 Q192 28 195 64 L202 92 Q215 113 218 146 L220 322 Q216 353 201 375 L192 405 Q130 431 68 405 L59 375 Q44 353 40 322 L42 146 Q45 113 58 92 L65 64 Q68 28 83 15 Z',
    windshieldPath: 'M85 112 Q130 95 175 112 L169 149 Q130 137 91 149 Z',
    rearWindowPath: 'M84 288 Q130 304 176 288 L180 312 Q130 327 80 312 Z',
    parts: suvParts,
  },
  pickup_light_commercial: {
    type: 'pickup_light_commercial',
    silhouettePath:
      'M86 18 Q130 4 174 18 Q189 30 193 64 L201 95 Q213 116 216 151 L216 402 Q205 424 181 426 L79 426 Q55 424 44 402 L44 151 Q47 116 59 95 L67 64 Q71 30 86 18 Z',
    windshieldPath: 'M87 116 Q130 99 173 116 L168 151 Q130 140 92 151 Z',
    rearWindowPath: 'M88 207 Q130 219 172 207 L174 227 Q130 236 86 227 Z',
    parts: pickupParts,
  },
};

export function isValidPartKey(bodyType: BodyType, partKey: string): boolean {
  return bodySchemas[bodyType].parts.some((part) => part.key === partKey);
}
