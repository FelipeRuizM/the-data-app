import React from 'react';

// Custom workout-split icons, hand-traced from the supplied anatomy line-art:
//   Pull → upper back, Legs → bent leg, Push → chest / abs.
// Drawn on a 512 grid (round caps/joins) and tinted via the `color` prop so they
// behave like the Lucide icons still used elsewhere (e.g. the "Mixed" category).

export interface CategoryIconProps extends Omit<React.SVGProps<SVGSVGElement>, 'color'> {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
}

const Svg: React.FC<CategoryIconProps & { children: React.ReactNode }> = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 18,
  children,
  ...rest
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 512 512"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {children}
  </svg>
);

// Upper back — traps/shoulders, shoulder blades, dashed spine, lats tapering to the waist.
export const PullIcon: React.FC<CategoryIconProps> = (props) => (
  <Svg {...props}>
    {/* trapezius / shoulders with neck collar */}
    <path d="M40 140C58 100 128 82 176 96C186 78 196 60 210 60L210 42L302 42L302 60C316 60 326 78 336 96C384 82 454 100 472 140" />
    {/* shoulder blades */}
    <path d="M214 168C196 198 172 218 150 230" />
    <path d="M298 168C316 198 340 218 362 230" />
    {/* spine */}
    <path d="M256 246L256 452" strokeDasharray="22 30" />
    {/* lats down to the waist */}
    <path d="M40 300C66 284 94 286 102 306C112 366 120 416 130 468L382 468C392 416 400 366 410 306C418 286 446 284 472 300" />
  </Svg>
);

// Two muscular legs, front view — calves, ankles and splayed feet. The left leg
// is traced once and mirrored to the right for symmetry.
const legOutline = (
  <>
    <path d="M98 4C100 55 106 100 110 134C98 172 92 205 96 232C100 288 116 340 132 388C140 408 134 424 120 434C96 454 64 456 54 462C40 470 42 488 60 490C104 494 152 492 172 484C188 477 190 462 186 442C198 396 214 348 208 300C230 274 240 232 232 196C226 166 210 150 198 150C182 150 176 120 172 92C170 60 168 30 166 4" />
    <path d="M132 20C140 62 138 104 128 134" strokeWidth={14} />
    <path d="M156 20C162 58 160 98 150 126" strokeWidth={14} />
    <path d="M140 268C158 296 174 314 192 322" strokeWidth={14} />
  </>
);

export const LegsIcon: React.FC<CategoryIconProps> = (props) => (
  <Svg {...props}>
    {legOutline}
    <g transform="matrix(-1 0 0 1 512 0)">{legOutline}</g>
  </Svg>
);

// Chest & abs — pecs, collarbones and a six-pack, sharing the back's torso outline.
export const PushIcon: React.FC<CategoryIconProps> = (props) => (
  <Svg {...props}>
    {/* trapezius / shoulders with neck collar */}
    <path d="M40 140C58 100 128 82 176 96C186 78 196 60 210 60L210 42L302 42L302 60C316 60 326 78 336 96C384 82 454 100 472 140" />
    {/* collarbones */}
    <path d="M150 150L220 168" strokeWidth={15} />
    <path d="M362 150L292 168" strokeWidth={15} />
    {/* pec line */}
    <path d="M110 292C170 300 214 296 238 266C246 254 250 246 256 246C262 246 266 254 274 266C298 296 342 300 402 292" />
    {/* lats / torso sides to the waist */}
    <path d="M40 300C66 284 94 286 102 306C112 366 120 416 130 468L382 468C392 416 400 366 410 306C418 286 446 284 472 300" />
    {/* abs */}
    <path d="M256 286L256 432" strokeWidth={15} />
    <path d="M198 350C218 362 238 362 252 350" strokeWidth={15} />
    <path d="M260 350C274 362 294 362 314 350" strokeWidth={15} />
    <path d="M200 404C220 416 238 416 252 404" strokeWidth={15} />
    <path d="M260 404C274 416 294 416 312 404" strokeWidth={15} />
  </Svg>
);
