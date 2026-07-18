#!/usr/bin/env python3
"""Normalize generated walk cycles and add motion-aware in-between frames."""

import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageStat

try:
    import numpy as np
except ImportError:
    np = None

try:
    if np is None:
        raise ImportError
    import cv2
except ImportError:
    cv2 = None


ROWS = 4
SOURCE_COLUMNS = 8
OUTPUT_COLUMNS = 64
CELL_SIZE = 256
OUTPUT_CELL_SIZE = 128
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
        for column in range(SOURCE_COLUMNS):
            left = round(column * atlas.width / SOURCE_COLUMNS)
            right = round((column + 1) * atlas.width / SOURCE_COLUMNS)
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


def alpha_aware_blend(first, second, progress):
    if np is None:
        transition = Image.blend(first, second, progress)
        transition.putalpha(
            ImageChops.lighter(
                first.getchannel("A"),
                second.getchannel("A"),
            )
        )
        return transition

    first_array = np.asarray(first, dtype=np.float32) / 255
    second_array = np.asarray(second, dtype=np.float32) / 255
    first_alpha = first_array[..., 3:4]
    second_alpha = second_array[..., 3:4]
    alpha_weight = first_alpha * (1 - progress) + second_alpha * progress
    color_weight = np.maximum(
        first_alpha * (1 - progress) + second_alpha * progress,
        1e-6,
    )
    color = (
        first_array[..., :3] * first_alpha * (1 - progress)
        + second_array[..., :3] * second_alpha * progress
    ) / color_weight
    output = np.concatenate((color, alpha_weight), axis=2)
    return Image.fromarray(
        np.clip(output * 255, 0, 255).astype(np.uint8),
        "RGBA",
    )


def flow_reference(image):
    pixels = np.asarray(image, dtype=np.float32)
    alpha = pixels[..., 3:4] / 255
    background = np.full_like(pixels[..., :3], 242)
    composite = pixels[..., :3] * alpha + background * (1 - alpha)
    return cv2.cvtColor(composite.astype(np.uint8), cv2.COLOR_RGB2GRAY)


def remap_channel(channel, flow, progress):
    height, width = channel.shape[:2]
    grid_x, grid_y = np.meshgrid(
        np.arange(width, dtype=np.float32),
        np.arange(height, dtype=np.float32),
    )
    return cv2.remap(
        channel,
        grid_x - flow[..., 0] * progress,
        grid_y - flow[..., 1] * progress,
        interpolation=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=0,
    )


def calculate_motion_fields(first, second):
    first_reference = flow_reference(first)
    second_reference = flow_reference(second)
    flow_forward = cv2.calcOpticalFlowFarneback(
        first_reference,
        second_reference,
        None,
        0.5,
        4,
        25,
        4,
        7,
        1.5,
        0,
    )
    flow_backward = cv2.calcOpticalFlowFarneback(
        second_reference,
        first_reference,
        None,
        0.5,
        4,
        25,
        4,
        7,
        1.5,
        0,
    )
    return flow_forward, flow_backward


def motion_intermediate(first, second, progress=0.5, motion_fields=None):
    if cv2 is None:
        return alpha_aware_blend(first, second, progress)

    flow_forward, flow_backward = (
        motion_fields
        if motion_fields is not None
        else calculate_motion_fields(first, second)
    )

    first_array = np.asarray(first, dtype=np.float32) / 255
    second_array = np.asarray(second, dtype=np.float32) / 255
    first_alpha = first_array[..., 3]
    second_alpha = second_array[..., 3]
    first_premultiplied = first_array[..., :3] * first_alpha[..., None]
    second_premultiplied = second_array[..., :3] * second_alpha[..., None]

    warped_first_alpha = remap_channel(first_alpha, flow_forward, progress)
    warped_second_alpha = remap_channel(
        second_alpha,
        flow_backward,
        1 - progress,
    )
    warped_first_color = remap_channel(
        first_premultiplied,
        flow_forward,
        progress,
    )
    warped_second_color = remap_channel(
        second_premultiplied,
        flow_backward,
        1 - progress,
    )

    output_alpha = (
        warped_first_alpha * (1 - progress)
        + warped_second_alpha * progress
    )
    output_premultiplied = (
        warped_first_color * (1 - progress)
        + warped_second_color * progress
    )
    output_color = output_premultiplied / np.maximum(
        output_alpha[..., None],
        1e-6,
    )
    output = np.dstack((output_color, output_alpha))
    return Image.fromarray(
        np.clip(output * 255, 0, 255).astype(np.uint8),
        "RGBA",
    )


def stabilize_frame(frame):
    bbox = alpha_bbox(frame)
    if bbox is None:
        raise ValueError("Generated in-between frame is blank")
    subject = frame.crop(bbox)
    paste_x = round(CELL_SIZE / 2 - alpha_centroid_x(subject))
    paste_y = BASELINE - subject.height
    stabilized = Image.new(
        "RGBA",
        (CELL_SIZE, CELL_SIZE),
        (0, 0, 0, 0),
    )
    stabilized.alpha_composite(subject, (paste_x, paste_y))
    return stabilized


def add_in_between_frames(frames):
    expanded = []
    frames_per_transition = OUTPUT_COLUMNS // len(frames)
    for index, frame in enumerate(frames):
        next_frame = frames[(index + 1) % len(frames)]
        expanded.append(frame)
        motion_fields = (
            calculate_motion_fields(frame, next_frame)
            if cv2 is not None
            else None
        )
        for step in range(1, frames_per_transition):
            expanded.append(
                stabilize_frame(
                    motion_intermediate(
                        frame,
                        next_frame,
                        step / frames_per_transition,
                        motion_fields,
                    )
                )
            )
    return expanded


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
        (OUTPUT_COLUMNS * OUTPUT_CELL_SIZE, ROWS * OUTPUT_CELL_SIZE),
        (0, 0, 0, 0),
    )
    report = []
    repaired_loops = []

    for row_index, row_cells in enumerate(rows):
        normalized = normalize_row(row_cells)
        normalized, repaired = repair_loop_outlier(normalized)
        if repaired:
            repaired_loops.append(row_index + 1)
        expanded = add_in_between_frames(normalized)
        for column_index, frame in enumerate(expanded):
            output_frame = frame.resize(
                (OUTPUT_CELL_SIZE, OUTPUT_CELL_SIZE),
                Image.Resampling.LANCZOS,
            )
            output.alpha_composite(
                output_frame,
                (
                    column_index * OUTPUT_CELL_SIZE,
                    row_index * OUTPUT_CELL_SIZE,
                ),
            )
            report.append(
                frame_metrics(frame, row_index + 1, column_index + 1)
            )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.suffix.lower() == ".webp":
        output.save(
            output_path,
            "WEBP",
            quality=82,
            method=6,
            exact=True,
        )
    else:
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
