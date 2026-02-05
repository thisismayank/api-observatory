import { describe, it, expect } from 'vitest';
import { CircularBuffer } from '../../src/core/CircularBuffer.js';

describe('CircularBuffer', () => {
  it('should throw on capacity < 1', () => {
    expect(() => new CircularBuffer(0)).toThrow();
    expect(() => new CircularBuffer(-1)).toThrow();
  });

  it('should start empty', () => {
    const buf = new CircularBuffer<number>(5);
    expect(buf.size).toBe(0);
    expect(buf.toArray()).toEqual([]);
  });

  it('should push and retrieve items in order', () => {
    const buf = new CircularBuffer<number>(5);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    expect(buf.size).toBe(3);
    expect(buf.toArray()).toEqual([1, 2, 3]);
  });

  it('should fill to capacity', () => {
    const buf = new CircularBuffer<number>(3);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    expect(buf.size).toBe(3);
    expect(buf.toArray()).toEqual([1, 2, 3]);
  });

  it('should overwrite oldest entries when at capacity', () => {
    const buf = new CircularBuffer<number>(3);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    buf.push(4); // overwrites 1
    expect(buf.size).toBe(3);
    expect(buf.toArray()).toEqual([2, 3, 4]);
  });

  it('should handle multiple overwrites correctly', () => {
    const buf = new CircularBuffer<number>(3);
    for (let i = 1; i <= 10; i++) {
      buf.push(i);
    }
    expect(buf.size).toBe(3);
    expect(buf.toArray()).toEqual([8, 9, 10]);
  });

  it('should work with capacity of 1', () => {
    const buf = new CircularBuffer<number>(1);
    buf.push(1);
    expect(buf.toArray()).toEqual([1]);
    buf.push(2);
    expect(buf.toArray()).toEqual([2]);
    expect(buf.size).toBe(1);
  });

  it('should clear all entries', () => {
    const buf = new CircularBuffer<number>(5);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    buf.clear();
    expect(buf.size).toBe(0);
    expect(buf.toArray()).toEqual([]);
  });

  it('should work after clear and re-push', () => {
    const buf = new CircularBuffer<number>(3);
    buf.push(1);
    buf.push(2);
    buf.clear();
    buf.push(10);
    buf.push(20);
    expect(buf.size).toBe(2);
    expect(buf.toArray()).toEqual([10, 20]);
  });

  it('should maintain insertion order in toArray after wrap-around', () => {
    const buf = new CircularBuffer<string>(4);
    buf.push('a');
    buf.push('b');
    buf.push('c');
    buf.push('d');
    buf.push('e'); // overwrites 'a'
    buf.push('f'); // overwrites 'b'
    expect(buf.toArray()).toEqual(['c', 'd', 'e', 'f']);
  });

  it('should handle large capacity', () => {
    const buf = new CircularBuffer<number>(10000);
    for (let i = 0; i < 10000; i++) {
      buf.push(i);
    }
    expect(buf.size).toBe(10000);
    const arr = buf.toArray();
    expect(arr[0]).toBe(0);
    expect(arr[9999]).toBe(9999);
  });

  it('should report correct capacity', () => {
    const buf = new CircularBuffer<number>(42);
    expect(buf.capacity).toBe(42);
  });
});
