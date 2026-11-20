# OMAR CIRCUIT LAB v2.1
### Medical Engineering Design, Electronics Simulation & 3D Prototyping Studio
**Designed & Developed by Eng. Omar Abdalla — KMTC Makindu Campus**


## 🎓 For students — start here

**Open the app in your browser (no installation):**
👉 **https://mohomartech.github.io/omar-circuit-lab/**

- **Password:** `OmarAbdalla` (case-sensitive)
- Use **Google Chrome** or **Microsoft Edge** on a laptop or desktop.
- Your projects are saved **only in your own browser**. Nobody else can see them. Use **Export → Project (JSON)** to keep a backup or hand work in.

**Suggested first hour:**
1. Dashboard → **Learning Centre** → *Voltage Divider & Ohm's Law*. Follow the 12 steps.
2. Open the **ECG Monitoring Front End** sample → **Run Simulation** → watch the oscilloscope.
3. Turn on **Trace** (press `T`) and click any pin to follow the circuit.
4. Open **3D View** and **Exploded View** to see the board.

**Work offline:** click **Code → Download ZIP** on this page, unzip it, then double-click `index.html`.

> ⚠️ **Safety:** the medical circuits are **educational prototypes only**. Never connect anything you design here to a person.

**Licence:** free for learning and teaching. See [LICENSE](LICENSE). Please credit *Omar Circuit Lab by Eng. Omar Abdalla* in coursework.

---


## 1. Setup

**Requirements:** Google Chrome or Microsoft Edge (recent version). No installation, no internet needed after unzipping (fonts fall back to system fonts when offline).

**Option A — open directly**
1. Unzip `omar-circuit-lab-v2.zip`.
2. Double-click `index.html` (opens in Chrome/Edge).

**Option 0 — online:** open https://mohomartech.github.io/omar-circuit-lab/ (no download needed).

**Option B — local web server (recommended; most reliable storage behaviour)**
```
cd omar-circuit-lab
python -m http.server 8080
```
Then open <http://localhost:8080>.

**Login:** the workspace password is **OmarAbdalla** (case-sensitive). It is built in only as a salted PBKDF2-SHA-256 hash, never as plaintext. You can change it in *Settings & About → Security*; *Reset this workspace* on the lock screen erases local projects and restores the default password.

## 2. Package contents

| Path | Purpose |
|---|---|
| `index.html` | Entry point |
| `app.css` | Visual identity & layout |
| `core.js` | State, undo/redo, IndexedDB storage, Web Crypto security |
| `library.js` | Component symbols, pins, parameters, simulation builders, parts catalog & datasheets |
| `sim.js` | Netlist extraction + MNA simulation engine (DC & transient) |
| `validate.js` | Prototype Validation & Circuit Health Checker |
| `editor.js` | SVG schematic editor |
| `medical.js` | Medical lab & sample projects (templates + documentation) |
| `pcb.js` | PCB studio: footprints, routing, DRC, Gerber/Excellon/BOM export |
| `view3d.js` | Dependency-free 3D renderer & exploded views |
| `copilot.js` | Local rule-based AI Engineering Copilot |
| `ui.js`, `pages.js` | Interface |

No external JavaScript libraries are used, so the app works fully offline.

## 3. Quick start (the 17-step workflow)

1. Open the app → 2. enter the password `OmarAbdalla` → 3. unlock.
4. **New Project** (toolbar) → *Blank schematic*.
5. In the left library search box type `resistor`.
6. Click *Resistor — carbon film ¼ W*, then click the canvas. Search `power supply`, place a *DC power supply*. Search `ground`, place a *Ground*. (You can also drag parts onto the canvas.)
7. **Connect:** click a pin (cyan dot), then click another pin. Click empty space while wiring to add bends; *Esc* cancels. Red dots = unconnected pins.
8. Select a part → edit values in **Properties** (SI prefixes work: `4.7k`, `100n`, `2.2M`).
9. **Run Simulation** (toolbar).
10. Read node voltages on the wires, values on meters, and the **Readings / Oscilloscope** tabs.
11. **Validate** — the health report highlights affected parts on the schematic.
12. **AI Engineering Copilot** — ask “Review my circuit” or “LED resistor 9V red”.
13. Select a part → **Datasheet** tab.
14. **3D View** → 15. **Exploded View** (slider or Disassemble/Assemble).
16. **Save** (Ctrl+S) → 17. reopen from **Project Manager** or the Dashboard.

**Shortcuts (designer):** `W` wire · `R` rotate · `Del` delete · `Ctrl+D` duplicate · `Ctrl+Z / Ctrl+Y` undo/redo · `F` fit · mouse wheel zoom · drag empty space (or Alt/middle-drag) to pan · double-click a switch to toggle it.

## 4. What is implemented

- **Schematic editor:** drag-and-drop, grid snapping, wiring with bends, move/rotate/duplicate/delete, net labels & power-rail symbols (connect across sheets), multiple sheets, net highlighting, unconnected-pin detection, undo/redo, JSON save/load.
- **Simulation engine (real maths):** Modified Nodal Analysis; Newton–Raphson with junction voltage limiting, source stepping and gmin stepping; transient analysis by backward Euler. Models: R, pot, C, L, ideal transformer, diode/Zener/LED (Shockley), BJT (Ebers–Moll), MOSFET (square law), op-amp/comparator/instrumentation amp (finite gain + rail limiting), linear regulator, 555 timer (event model), logic gates, ADC/DAC, sensors (NTC, LDR, photodiode, LM35, MPX5010, O₂ cell, flow), partial MCU board model, sources (DC, battery, current, signal generator, mains, simulated ECG & PPG), instruments (DMM, ammeter, 2-ch oscilloscope, frequency counter).
- **Live visualisation:** wire colours by node voltage, animated current flow (direction & log-scaled speed), LED glow by current, meter readouts, oscilloscope with Vpp/Vavg/Vrms/frequency, sim speed/continuous mode.
- **Validation:** ratings (V, I, P), polarity, shorts, open/unconnected pins, floating inputs, missing ground, conflicting sources, regulator dropout/swapped pins, logic-level mismatch, missing fuse/flyback diode, thermal estimates — with severity levels and fixes. Unsupported checks are listed in the report.
- **Medical lab:** ECG front end, pulse oximeter, digital thermometer, O₂ concentrator monitor, infusion-pump control, patient monitor — each with schematic, BOM, block diagram, principle, calculations, live simulation results, troubleshooting, improvements, safety notes.
- **PCB studio:** footprints from the schematic, overlap-free auto-placement, interactive 2-layer routing with vias, clearance-checked simple auto-router, DRC, Gerber (copper + outline), Excellon drill, BOM CSV, layout JSON.
- **3D workbench:** board layers, packages (axial with real colour bands, radial, TO-92, TO-220, DIP, LEDs, headers, MCU module), orbit/pan/zoom, picking with pin/net identification, labels, exploded-view slider and assembly animation, net-voltage animation on tracks.
- **Engineering notebook:** typed entries attached to components, insert simulation results, 12-section documentation template, design revisions with restore, HTML report (print to PDF), JSON export.
- **Learning centre:** 10 guided 12-step lessons with beginner / diploma / advanced explanations.
- **Security:** built-in password (OmarAbdalla), login, change, lock, inactivity lock, PBKDF2 hashing via Web Crypto.


## 4a. New in v2.1 — 3D Workbench, PCB pin visibility, TRACE MY CIRCUIT

**One authoritative pin map.** Every part + footprint has a single pin table (pad number → schematic pin → name → function). The schematic shows pad numbers beside each pin, and the PCB, 3D model and simulator all use the same table. Named parts follow their manufacturer pinouts (PN2222A/2N3906 TO-92 = E-B-C, BC547 = C-B-E, IRF540N/IRLZ44N = G-D-S, 78xx = IN-GND-OUT, LM317 = ADJ-OUT-IN, AMS1117 SOT-223, LM35, MPX5010, LM741/TL081, LM358/LM393, INA128/AD620, NE555, 74HC00/02/04/08/32/86). Generic parts use the most common pinout and are labelled *generic — verify*. Diodes/LEDs: pad 1 = cathode.
Supply pins that the simulation treats as implicit (op-amp V+/V−, logic VCC/GND, 555 RESET/CTRL) appear on the footprint, marked *implicit*, so you remember to wire them in hardware.

**PCB pin visibility:** pad numbers inside pads, pin names beside them, pin 1 = square pad + silkscreen dot, reference designators, polarity marks (+, cathode bar), zoom-dependent label sizing with overlap avoidance. Selectable layers: top/bottom copper, silkscreen, solder mask, drill, fabrication, ratsnest, pad numbers, pin names. THT and SMD pads are drawn differently, and selected parts can switch between THT and SMD footprints (0805, SOD-123, SOT-23, SOIC-8/14, SOT-223). Hover any pad (or schematic pin, or 3D pad) for a tooltip: reference, pad number, name, function, net, live voltage/current, connection status.

**TRACE MY CIRCUIT:** turn on Trace (schematic floatbar, `T`, or the 3D toolbar) and click any pin or pad. The tool shows the selected pin, its net, every connected pad, wire and track, and the destination parts and pins as a step-by-step path (e.g. *U1·D13 → R2 → D1·A → D1·K → GND*). *Forward* goes from the pin into its net; *Reverse* goes through the part to its other terminal first. Highlighting is synchronised across schematic, PCB and 3D, and the **Netlist verification** table compares each traced net's schematic pins against PCB pads and copper connectivity.

**3D Workbench:** Top, Bottom, Front, Back, Left, Right and Iso presets; perspective and orthographic modes; a clickable navigation cube; axes gizmo; grid; WASD/QE fly controls; full-screen mode; collapsible side panel; split screen with the schematic or 2D PCB (draggable divider, synchronised selection and trace). Layer toggles, component transparency, exploded view, ratsnest lines, pad labels, a **Move part** tool with 0.635 mm snapping that updates the PCB, and automatic 3D rebuild whenever the PCB or schematic changes. New models: SMD packages, tactile switch, pressure sensor with port, LED flat/cathode marks, diode band on the cathode side.

**Acceptance test (verified):** design in the schematic → inspect in 3D → see pad numbers and names → hover/select a pin to get its function → trace from pin to pin → highlighting follows across schematic, PCB and 3D → the verification table matches the netlist. Across all 15 templates, every pad maps to a real schematic pin on the same net, and every on-board schematic pin has a pad.

## 5. Honest limitations

- Device models are **simplified educational models**, not validated SPICE models. Op-amps have no slew-rate/bandwidth limit; the transformer is ideal; motors have no back-EMF.
- **Catalog-only parts** (SCR, TRIAC, IGBT, AD8232, MAX30102, DS18B20, DHT22, PIC, custom components…) are placed and documented but not simulated.
- **PCB exports are not manufacturing-ready:** Gerber includes copper, outline and a basic silkscreen (outlines + pin-1 dots, no text); no solder-mask, paste or copper-pour layers. Review in a Gerber viewer before use.
- **3D models** are simplified package outlines (correct pad and lead positions; bodies are approximate). Implicit supply pins exist on footprints but are not connected in the schematic model.
- The **AI Copilot is a local rule-based engine.** No external AI service is connected. An architecture for a secure future integration (server-side proxy; never put API keys in browser code) is documented in Settings & About.
- **Client-side password protection** keeps casual users out of the workspace on that device. It cannot hide the source code or stored data from someone with developer tools. For IP protection use a signed desktop build (Electron/Tauri) or an authenticated server deployment.
- **Medical projects are educational prototypes only** — not medical devices. Never connect experimental circuits to people.
- Inside embedded viewers (e.g. a claude.ai artifact) file downloads and printing are blocked; use the **Copy** buttons there, or run the app locally.

## 6. Planned (not yet implemented)
SPICE model import · switching-converter simulation · SCR/TRIAC/IGBT models · firmware execution · copper pours & full Gerber layer set · >2-layer boards · STEP export · external AI integration · direct PDF generation.

---
© Eng. Omar Abdalla — KMTC Makindu Campus · OMAR CIRCUIT LAB v2.1
