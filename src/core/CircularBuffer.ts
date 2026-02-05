/**
 * Fixed-capacity ring buffer with O(1) push.
 * Overwrites the oldest entry when capacity is reached.
 */
export class CircularBuffer<T> {
  private buffer: (T | undefined)[];
  private head: number = 0;
  private _size: number = 0;
  readonly capacity: number;

  constructor(capacity: number) {
    if (capacity < 1) {
      throw new Error('CircularBuffer capacity must be >= 1');
    }
    this.capacity = capacity;
    this.buffer = new Array<T | undefined>(capacity);
  }

  /** Number of items currently in the buffer */
  get size(): number {
    return this._size;
  }

  /** Push an item. O(1). Overwrites oldest if at capacity. */
  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this._size < this.capacity) {
      this._size++;
    }
  }

  /** Return all valid entries in insertion order (oldest first). */
  toArray(): T[] {
    if (this._size === 0) return [];

    const result: T[] = new Array(this._size);
    // If buffer is not full, items start at index 0
    // If buffer is full, oldest item is at `head` (since head points to next write position)
    const start = this._size < this.capacity ? 0 : this.head;
    for (let i = 0; i < this._size; i++) {
      result[i] = this.buffer[(start + i) % this.capacity] as T;
    }
    return result;
  }

  /** Clear all entries */
  clear(): void {
    this.buffer = new Array<T | undefined>(this.capacity);
    this.head = 0;
    this._size = 0;
  }
}
