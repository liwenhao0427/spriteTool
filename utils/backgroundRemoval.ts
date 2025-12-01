// Helper to check if a pixel color matches the background color within a given tolerance.
const isMatch = (data: Uint8ClampedArray, index: number, bg: { r: number; g: number; b: number }, tolerance: number): boolean => {
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];
  // Calculate the color difference.
  const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
  // Normalize tolerance and check if the difference is within the threshold.
  return diff <= tolerance * 3;
};

/**
 * Removes the background of an image using an edge-detection (flood-fill from borders) algorithm.
 * This prevents removing parts of the sprite that are the same color as the background but not connected to the edge.
 * @param imageData The ImageData object of the canvas.
 * @param bgColor The background color to remove.
 * @param tolerance The color matching tolerance.
 * @returns The processed ImageData object.
 */
export const removeBackgroundByEdge = (
    imageData: ImageData,
    bgColor: { r: number, g: number, b: number },
    tolerance: number
): ImageData => {
    const { width, height, data } = imageData;
    const visited = new Uint8Array(width * height);
    const queue: [number, number][] = [];

    // Seed the queue with all border pixels that match the background color.
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                const index = (y * width + x);
                if (!visited[index] && isMatch(data, index * 4, bgColor, tolerance)) {
                    queue.push([x, y]);
                    visited[index] = 1; // Mark as visited
                }
            }
        }
    }

    // Perform a Breadth-First Search (BFS) flood-fill from the border pixels.
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // Right, Left, Down, Up
    let head = 0;
    while(head < queue.length) {
        const [x, y] = queue[head++];
        const index = (y * width + x) * 4;
        data[index + 3] = 0; // Set the alpha of matching pixels to 0 (transparent).

        // Check neighbors
        for(const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            // Check if the neighbor is within the image bounds.
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIndex = (ny * width + nx);
                // If the neighbor hasn't been visited and matches the background color, add it to the queue.
                if (!visited[nIndex] && isMatch(data, nIndex * 4, bgColor, tolerance)) {
                    visited[nIndex] = 1;
                    queue.push([nx, ny]);
                }
            }
        }
    }

    return imageData;
};

/**
 * Removes the background of an image by matching all pixels of a certain color.
 * This can remove parts inside the sprite if they match the background color.
 * @param imageData The ImageData object of the canvas.
 * @param bgColor The background color to remove.
 * @param tolerance The color matching tolerance.
 * @returns The processed ImageData object.
 */
export const removeBackgroundByColor = (
    imageData: ImageData,
    bgColor: { r: number, g: number, b: number },
    tolerance: number
): ImageData => {
    const { data } = imageData;
    for (let i = 0; i < data.length; i += 4) {
        if (isMatch(data, i, bgColor, tolerance)) {
            data[i + 3] = 0; // Set alpha to 0.
        }
    }
    return imageData;
};
