#!/usr/bin/env python3
"""Normalize generated walk-cycle cells to a stable body center and baseline."""

import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageStat


ROWS = 4
COLS = 8
CELL_SIZE = 256
BASELINE = 244
ALPHA_THRESHOLD = 24


def alpha_bbox(image):
    mask = image.getchannel("A").point(
        lambda value: 255 if value >= ALPHA_THRESHOLD else 0
    )
    return mask.getbbox()


def alpha_centroid_x(image):
    alpha = image.getchannel("A")
    pixels = list(alpha.get_flattened_data())
    weights = [
        sum(pixels[x::alpha.width])
        for x in range(alpha.width)
    ]
    total = sum(weights)
    if total == 0:
        return image.width / 2
    return sum(x * weight for x, weight in enumerate(weights)) / total


def upper_body_centroid_x(image):
    alpha = image.getchannel("A")
    upper_height = max(1, round(alpha.height * 0.68))
    upper = alpha.crop((0, 0, alpha.width, upper_height))
    pixels = list(upper.get_flattened_data())
    weights = [
        sum(pixels[x::upper.width])
        for x in range(upper.width)
    ]
    total = sum(weights)
    if total == 0:
        return image.width / 2
    return sum(x * weight for x, weight in enumerate(weights)) / total


def split_cells(atlas):
    cells = []
    for row in range(ROWS):
        row_cells = []
        top = round(row * atlas.height / ROWS)
        bottom = round((row + 1) * atlas.height / ROWS)
        for column in range(COLS):
            left = round(column * atlas.width / COLS)
            right = round((column + 1) * atlas.width / COLS)
            cell = atlas.crop((left, top, right, bottom))
            bbox = alpha_bbox(cell)
            if bbox is None:
                raise ValueError(f"Blank frame at row {row + 1}, column {column + 1}")
            row_cells.append(cell.crop(bbox))
        cells.append(row_cells)
    return cells


def normalize_row(row_cells):
    centers = [alpha_centroid_x(cell) for cell in row_cells]
    target_height = min(
        [232]
        + [
            122 * cell.height / max(center, 1)
            for cell, center in zip(row_cells, centers)
        ]
        + [
            122 * cell.height / max(cell.width - center, 1)
            for cell, center in zip(row_cells, centers)
        ]
    )
    normalized = []

    for cell in row_cells:
        scale = target_height / cell.height
        width = max(1, round(cell.width * scale))
        height = max(1, round(cell.height * scale))
        resized = cell.resize((width, height), Image.Resampling.LANCZOS)
        resized_bbox = alpha_bbox(resized)
        if resized_bbox is None:
            raise ValueError("Frame became blank while resizing")
        resized = resized.crop(resized_bbox)
        center_x = alpha_centroid_x(resized)
        paste_x = round(CELL_SIZE / 2 - center_x)
        paste_y = BASELINE - resized.height
        frame = Image.new("RGBA", (CELL_SIZE, CELL_SIZE), (0, 0, 0, 0))
        frame.alpha_composite(resized, (paste_x, paste_y))
        normalized.append(frame)

    return normalized


def frame_difference(first, second):
    difference = ImageChops.difference(first, second)
    return sum(ImageStat.Stat(difference).mean) / 4


def repair_loop_outlier(frames):
    previous = frames[-2]
    candidate = frames[-1]
    first = frames[0]
    direct_difference = frame_difference(previous, first)
    candidate_difference = max(
        frame_difference(previous, candidate),
        frame_difference(candidate, first),
    )
    if direct_difference >= 20 or candidate_difference <= direct_difference * 2.25:
        return frames, False

    repaired = list(frames)
    transition = Image.blend(previous, first, 0.5)
    transition.putalpha(
        ImageChops.lighter(previous.getchannel("A"), first.getchannel("A"))
    )
    repaired[-1] = transition
    return repaired, True


def frame_metrics(frame, row, column):
    bbox = alpha_bbox(frame)
    if bbox is None:
        raise ValueError(f"Normalized frame is blank at row {row}, column {column}")
    subject = frame.crop(bbox)
    contact_band = frame.getchannel("A").crop(
        (0, max(0, bbox[3] - 5), CELL_SIZE, bbox[3])
    )
    contact_pixels = sum(
        1
        for value in contact_band.get_flattened_data()
        if value >= 128
    )
    return {
        "row": row,
        "column": column,
        "bbox": list(bbox),
        "baseline": bbox[3],
        "visualCenterX": round(bbox[0] + alpha_centroid_x(subject), 2),
        "upperBodyCenterX": round(bbox[0] + upper_body_centroid_x(subject), 2),
        "contactPixels": contact_pixels,
    }


def normalize_atlas(input_path, output_path):
    source = Image.open(input_path).convert("RGBA")
    rows = split_cells(source)
    output = Image.new(
        "RGBA",
        (COLS * CELL_SIZE, ROWS * CELL_SIZE),
        (0, 0, 0, 0),
    )
    report = []
    repaired_loops = []

    for row_index, row_cells in enumerate(rows):
        normalized = normalize_row(row_cells)
        normalized, repaired = repair_loop_outlier(normalized)
        if repaired:
            repaired_loops.append(row_index + 1)
        for column_index, frame in enumerate(normalized):
            output.alpha_composite(
                frame,
                (column_index * CELL_SIZE, row_index * CELL_SIZE),
            )
            report.append(
                frame_metrics(frame, row_index + 1, column_index + 1)
            )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output.save(output_path, optimize=True)
    return report, repaired_loops


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()

    report, repaired_loops = normalize_atlas(args.input, args.output)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(
            json.dumps(report, ensure_ascii=True, indent=2),
            encoding="utf-8",
        )

    baselines = {entry["baseline"] for entry in report}
    centers = [entry["visualCenterX"] for entry in report]
    upper_centers = [entry["upperBodyCenterX"] for entry in report]
    contacts = [entry["contactPixels"] for entry in report]
    heights = [entry["bbox"][3] - entry["bbox"][1] for entry in report]
    print(
        json.dumps(
            {
                "frames": len(report),
                "baselines": sorted(baselines),
                "centerRange": [round(min(centers), 2), round(max(centers), 2)],
                "upperBodyCenterRange": [
                    round(min(upper_centers), 2),
                    round(max(upper_centers), 2),
                ],
                "heightRange": [min(heights), max(heights)],
                "minimumContactPixels": min(contacts),
                "repairedLoopRows": repaired_loops,
                "output": str(args.output),
            },
            ensure_ascii=True,
        )
    )


if __name__ == "__main__":
    main()
