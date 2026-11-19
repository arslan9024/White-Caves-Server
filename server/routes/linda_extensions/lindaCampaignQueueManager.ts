const queue: any[] = [];
export function enqueue(c: any) { queue.push(c); }
export function listQueue() { return queue; }
export default { enqueue, listQueue };
