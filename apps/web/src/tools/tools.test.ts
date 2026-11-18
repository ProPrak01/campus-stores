import { test } from "node:test";
import assert from "node:assert/strict";
import { seedState } from "@campus/shared";
import { calculate } from "./calculator";
import { sizeFromDiagonal, sizeFromWidth, imageAtDistance, distanceForWidth } from "./geometry";
import { convert } from "./units";
import { adapterAdvice } from "./connections";
import { PROJECTOR_SPECS } from "./specs";

const val = (s: string) => {
  const r = calculate(s);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.value;
};
const err = (s: string) => {
  const r = calculate(s);
  assert.equal(r.ok, false);
  return r.ok ? "" : r.error;
};
const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} is not near ${b}`);

test("calculator: precedence, brackets, unary minus, percent", () => {
  assert.equal(val("2+3*4"), 14);
  assert.equal(val("(2+3)*4"), 20);
  assert.equal(val("-3+5"), 2);
  assert.equal(val("2*-3"), -6);
  assert.equal(val("50%"), 0.5);
  assert.equal(val("200*10%"), 20);
  assert.equal(val("6×7÷2"), 21);
  assert.equal(val("0.1+0.2"), 0.3);
  assert.equal(val(" 1 + 1 "), 2);
});

test("calculator: bad input gives a message, never a crash or code execution", () => {
  assert.match(err("1/0"), /divide by zero/);
  assert.match(err("2+"), /Expected a number/);
  assert.match(err("(1+2"), /closing bracket/);
  assert.match(err("2 3"), /Unexpected/);
  assert.match(err("alert(1)"), /Expected a number/);
  assert.match(err("constructor"), /Expected a number/);
  assert.match(err(""), /Type a sum/);
});

test("screen size: 55 inch 16:9 is about 47.94 x 26.96", () => {
  const s = sizeFromDiagonal(55, "16:9");
  near(s.width, 47.9366, 1e-3);
  near(s.height, 26.9644, 1e-3);
  near(sizeFromWidth(s.width, "16:9").diagonal, 55);
});

test("screen size: 4:3 uses 3-4-5", () => {
  const s = sizeFromDiagonal(10, "4:3");
  near(s.width, 8);
  near(s.height, 6);
});

test("projector throw: width is distance over throw ratio, smallest at the longest throw", () => {
  const spec = PROJECTOR_SPECS["PR-04"]!; // 1.15 to 1.5
  const { smallest, largest } = imageAtDistance(3, spec, "16:9");
  near(smallest.width, 3 / 1.5);
  near(largest.width, 3 / 1.15);
  near(largest.height, ((3 / 1.15) * 9) / 16);
  const d = distanceForWidth(2, spec);
  near(d.nearest, 2.3);
  near(d.farthest, 3);
});

test("converters", () => {
  near(convert(10, "Length", "ft", "m"), 3.048);
  near(convert(100, "Length", "cm", "in"), 39.37007874);
  near(convert(5, "Weight", "kg", "lb"), 11.0231131);
  near(convert(0, "Temperature", "°C", "°F"), 32);
  near(convert(212, "Temperature", "°F", "°C"), 100);
  near(convert(-40, "Temperature", "°C", "°F"), -40);
  assert.throws(() => convert(1, "Length", "m", "parsec"));
});

test("connection checker finds the adapter on the shelf, then who has it", () => {
  const s = seedState();
  assert.match(adapterAdvice("HDMI", s), /No adapter needed/);
  assert.match(adapterAdvice("USB-C", s), /AD-12 on shelf \(bin C4\), AD-15 on shelf \(bin C4\)/);
  assert.match(adapterAdvice("VGA", s), /no VGA → HDMI adapter/);

  for (const id of ["AD-12", "AD-15"])
    s.loans.push({
      num: 500 + s.loans.length,
      requestId: "RQ-214",
      assetId: id,
      collectedBy: "Kabir Sen",
      holder: id === "AD-12" ? "Leela Das" : "Kabir Sen",
      dueLabel: id === "AD-12" ? "Sat 9 am" : "Sat noon",
      dueAt: id === "AD-12" ? "2026-11-21T09:00:00" : "2026-11-21T12:00:00",
      returned: false,
      history: [],
    });
  assert.match(adapterAdvice("USB-C", s), /All USB-C → HDMI adapters are out\. Next back: AD-12 with Leela Das, due Sat 9 am/);
});
