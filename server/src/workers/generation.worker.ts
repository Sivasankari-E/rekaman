/**
 * Generation worker — Day 5 fills this in.
 *
 * Scope when implemented:
 *   - Subscribe to the `generation` BullMQ queue.
 *   - For each job: poll Meshy until SUCCEEDED|FAILED|timeout.
 *   - On SUCCEEDED: download the GLB, upload to the products S3 bucket
 *     under `s3Keys.productGlb(brandId, productId, version)`, mark the
 *     product READY with the public URL.
 *   - On FAILED or timeout: mark FAILED with an `isTransient` hint so the
 *     dashboard can offer a one-click retry where appropriate.
 *
 * Why empty today: Day 4 ships the API surface so the dashboard team can
 * integrate against it; jobs enqueued while the worker is silent simply pile
 * up in Redis (BullMQ persists them) and will drain once the worker comes
 * online tomorrow. Crucially this means we do NOT enable the queue for
 * paying brands until the worker ships — an enqueue without a consumer is
 * dropped on the floor for the user even though Redis remembers it.
 */
export {};
