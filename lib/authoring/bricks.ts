/**
 * Human-readable documentation for the built-in engine bricks (the default,
 * always-present primitives that wrap the engine actions). Used to list and
 * explain the defaults wherever bricks appear.
 */

export interface BrickDoc {
  id: string;
  action: string;
  label: string;
  description: string;
}

export const BUILTIN_BRICK_DOCS: Record<string, BrickDoc> = {
  step: {
    id: "step",
    action: "moveForward",
    label: "Move Forward",
    description: "Advance one tile in the direction the robot is facing.",
  },
  "pivot-left": {
    id: "pivot-left",
    action: "turnLeft",
    label: "Turn Left",
    description: "Rotate 90° counter-clockwise, staying on the same tile.",
  },
  "pivot-right": {
    id: "pivot-right",
    action: "turnRight",
    label: "Turn Right",
    description: "Rotate 90° clockwise, staying on the same tile.",
  },
  hold: {
    id: "hold",
    action: "wait",
    label: "Wait",
    description: "Do nothing for one tick — used to settle on the goal.",
  },
  "pick-up": {
    id: "pick-up",
    action: "pickUp",
    label: "Pick Up",
    description: "Load a waiting package from the robot's current tile when cargo space is free.",
  },
  deliver: {
    id: "deliver",
    action: "deliver",
    label: "Deliver",
    description: "Unload a carried package at its matching delivery zone.",
  },
  charge: {
    id: "charge",
    action: "charge",
    label: "Charge",
    description: "Restore battery power while standing on a charging station.",
  },
};

/** Best-effort doc for any brick id (built-in or user-composed). */
export function brickDoc(id: string): BrickDoc {
  return (
    BUILTIN_BRICK_DOCS[id] ?? {
      id,
      action: "",
      label: id,
      description: "A function you composed.",
    }
  );
}
