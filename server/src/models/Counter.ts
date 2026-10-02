import mongoose, { Schema } from "mongoose";

// Atomic sequences for human-readable, gap-free document numbers (orders, receipts)
const CounterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", CounterSchema);

export const nextSequence = async (name: string): Promise<number> => {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return counter!.seq;
};

// e.g. formatDocNumber("RCT", 2026, 42) -> "RCT-2026-000042"
export const formatDocNumber = (prefix: string, year: number, seq: number) =>
  `${prefix}-${year}-${String(seq).padStart(6, "0")}`;

export default Counter;
