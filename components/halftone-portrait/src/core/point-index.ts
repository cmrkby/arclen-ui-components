import type {Point} from './math';

/** Home coordinates stay on the sampling grid, even while dots move. */
export class PointIndex {
  private rows: Point[][] = [];
  private pitch = 1;

  rebuild(points: Point[], pitch: number) {
    this.pitch = pitch;
    this.rows = [];
    for (const point of points) {
      const row = Math.round(point.homeY / pitch);
      (this.rows[row] ??= []).push(point);
    }
  }

  forEach(left: number, top: number, right: number, bottom: number, visit: (point: Point) => void) {
    const first = Math.max(0, Math.ceil(top / this.pitch));
    const last = Math.min(this.rows.length - 1, Math.floor(bottom / this.pitch));
    for (let y = first; y <= last; y++) {
      const row = this.rows[y];
      if (!row) continue;
      let low = 0, high = row.length;
      while (low < high) {
        const mid = (low + high) >>> 1;
        if (row[mid]!.homeX < left) low = mid + 1;
        else high = mid;
      }
      for (let i = low; i < row.length && row[i]!.homeX <= right; i++) visit(row[i]!);
    }
  }
}
