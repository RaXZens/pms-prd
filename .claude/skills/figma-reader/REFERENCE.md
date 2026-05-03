# Figma Reader — Reference

## Node types

| Figma type | Maps to |
|---|---|
| `FRAME` | `<div>` with layout props |
| `COMPONENT` | React component definition |
| `COMPONENT_SET` | Component with `variant` union prop |
| `INSTANCE` | Component usage with overridden props |
| `TEXT` | `<p>`, `<h1>`–`<h6>`, `<span>` based on style |
| `RECTANGLE` | `<div>` (background/border) or `<img>` (image fill) |
| `VECTOR` / `ELLIPSE` / `STAR` | SVG export → `<img>` or inline SVG |
| `GROUP` | `<div>` (no layout semantics; prefer FRAME) |
| `SECTION` | Organizational only — skip or use as comment |

## Layout property mappings

### `primaryAxisAlignItems`
| Figma | Tailwind |
|---|---|
| `MIN` | `justify-start` |
| `CENTER` | `justify-center` |
| `MAX` | `justify-end` |
| `SPACE_BETWEEN` | `justify-between` |

### `counterAxisAlignItems`
| Figma | Tailwind |
|---|---|
| `MIN` | `items-start` |
| `CENTER` | `items-center` |
| `MAX` | `items-end` |
| `BASELINE` | `items-baseline` |

### Sizing (`layoutSizingHorizontal` / `layoutSizingVertical`)
| Figma | CSS / Tailwind |
|---|---|
| `FIXED` | `w-[{width}px]` / `h-[{height}px]` |
| `FILL` | `w-full` / `h-full` |
| `HUG` | `w-fit` / `h-fit` (or no width) |

## Design token extraction

From `GET /files/{key}/styles` response, each style has a `node_id`. Fetch the node to get the actual values:

```
GET /files/{key}/nodes?ids={style_node_ids}
```

### Color token shape
```json
{
  "fills": [{ "type": "SOLID", "color": { "r": 0.2, "g": 0.4, "b": 1, "a": 1 } }]
}
```
Convert `r/g/b` (0–1 floats) to hex: `Math.round(r * 255).toString(16).padStart(2, '0')`.

### Text token shape
```json
{
  "style": {
    "fontFamily": "Inter",
    "fontWeight": 600,
    "fontSize": 16,
    "lineHeightPx": 24,
    "letterSpacing": 0.5,
    "textCase": "UPPER"
  }
}
```

### Effect token shape (shadows)
```json
{
  "effects": [{
    "type": "DROP_SHADOW",
    "color": { "r": 0, "g": 0, "b": 0, "a": 0.1 },
    "offset": { "x": 0, "y": 2 },
    "radius": 4
  }]
}
```
Maps to CSS: `box-shadow: 0px 2px 4px rgba(0,0,0,0.1)`.

## Component variants

A `COMPONENT_SET` contains multiple `COMPONENT` children. Each child's name encodes its variant values as `Key=Value` pairs separated by `,`:

```
Button/Size=Large,State=Default
Button/Size=Large,State=Hover
Button/Size=Small,State=Default
```

Map these to a TypeScript union type:
```ts
type ButtonProps = {
  size: 'Large' | 'Small';
  state: 'Default' | 'Hover';
}
```

## API quick reference

```
Base URL: https://api.figma.com/v1
Auth header: X-Figma-Token: {token}

GET /files/{key}                          Full document tree
GET /files/{key}/nodes?ids={ids}          Specific nodes (comma-separated)
GET /files/{key}/components               Published components
GET /files/{key}/styles                   Published styles
GET /images/{key}?ids={ids}&format=svg    Export as SVG (also: png, jpg, pdf)
GET /images/{key}?ids={ids}&format=png&scale=2  Retina PNG
```

## Common pitfalls

- **Node IDs in URLs** use `-` as separator (`1-23`); the API uses `:` (`1:23`). The fetch script handles this conversion automatically.
- **Color values** are 0–1 floats, not 0–255 integers.
- **Full file fetch** can be very large for complex files — prefer `--node` for a specific frame.
- **Hidden layers** have `"visible": false` — skip them in component output.
- **Absolute-positioned children** have `"layoutPositioning": "ABSOLUTE"` — use `absolute` + `top`/`left` from `x`/`y` relative to parent.
