export function createTaskSwipeController({ onComplete, onDelay }) {
  let activeSwipe = null;

  function reset(swipe) {
    swipe.front.style.transition = "transform 0.18s ease";
    swipe.front.style.transform = "translateX(0)";
    swipe.cardElement.classList.remove("is-swiping", "is-completing", "is-delaying");
  }

  function scheduleFrame() {
    if (!activeSwipe || activeSwipe.rafId) return;
    activeSwipe.rafId = requestAnimationFrame(() => {
      if (!activeSwipe) return;
      activeSwipe.front.style.transform = `translateX(${activeSwipe.deltaX}px)`;
      activeSwipe.rafId = null;
    });
  }

  function start(event, task, cardElement) {
    if (task.completed || event.target.closest("button, summary, details")) return;
    const front = cardElement.querySelector(".task-card-front");
    activeSwipe = {
      taskId: task.id,
      cardElement,
      front,
      startX: event.clientX,
      startY: event.clientY,
      deltaX: 0,
      isDragging: false,
      isScrolling: false,
      rafId: null,
    };
    front.style.transition = "none";
    front.setPointerCapture?.(event.pointerId);
  }

  function move(event, task) {
    if (!activeSwipe || activeSwipe.taskId !== task.id) return;
    const deltaX = event.clientX - activeSwipe.startX;
    const deltaY = event.clientY - activeSwipe.startY;

    if (!activeSwipe.isDragging && !activeSwipe.isScrolling) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
        activeSwipe.isScrolling = true;
        return;
      }
      if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
        activeSwipe.isDragging = true;
        activeSwipe.cardElement.classList.add("is-swiping");
      }
    }

    if (!activeSwipe.isDragging) return;
    event.preventDefault();
    const maxSwipe = activeSwipe.cardElement.offsetWidth * 0.55;
    activeSwipe.deltaX = Math.max(-maxSwipe, Math.min(deltaX, maxSwipe));
    scheduleFrame();
  }

  function end(event, task) {
    if (!activeSwipe || activeSwipe.taskId !== task.id) return;
    const threshold = activeSwipe.cardElement.offsetWidth * 0.35;
    const shouldComplete = activeSwipe.isDragging && activeSwipe.deltaX <= -threshold;
    const shouldDelay = activeSwipe.isDragging && activeSwipe.deltaX >= threshold;
    const swipe = activeSwipe;
    swipe.front.releasePointerCapture?.(event.pointerId);

    if (shouldComplete) {
      swipe.front.style.transition = "transform 0.18s ease";
      swipe.front.style.transform = `translateX(${-Math.min(96, swipe.cardElement.offsetWidth * 0.42)}px)`;
      swipe.cardElement.classList.add("is-completing");
      window.setTimeout(() => onComplete(task.id), 150);
    } else if (shouldDelay) {
      swipe.front.style.transition = "transform 0.18s ease";
      swipe.front.style.transform = `translateX(${Math.min(96, swipe.cardElement.offsetWidth * 0.42)}px)`;
      swipe.cardElement.classList.add("is-delaying");
      window.setTimeout(() => onDelay(task.id), 150);
    } else {
      reset(swipe);
    }

    if (swipe.isDragging) {
      swipe.front.dataset.ignoreClick = "true";
      window.setTimeout(() => delete swipe.front.dataset.ignoreClick, 220);
    }
    activeSwipe = null;
  }

  function cancel(event, task) {
    if (!activeSwipe || activeSwipe.taskId !== task.id) return;
    activeSwipe.front.releasePointerCapture?.(event.pointerId);
    reset(activeSwipe);
    activeSwipe = null;
  }

  function bind(cardElement, task) {
    const front = cardElement.querySelector(".task-card-front");
    front.addEventListener("pointerdown", (event) => start(event, task, cardElement));
    front.addEventListener("pointermove", (event) => move(event, task));
    front.addEventListener("pointerup", (event) => end(event, task));
    front.addEventListener("pointercancel", (event) => cancel(event, task));
  }

  return { bind };
}
