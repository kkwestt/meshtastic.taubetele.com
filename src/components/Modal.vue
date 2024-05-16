<template>
  <div class="modal-overlay">
    <div
      class="modal"
      :style="{ maxWidth: `${maxWidth}px` }"
      :class="{ 'full-height': fullHeight, 'full-width': fullWidth  }"
    >
      <div class="modal_header">
        <div class="modal_title">
          {{title}}
        </div>
        <button
          type="button"
          class="modal_close"
          @click="$emit('close')"
        >
          <font-awesome-icon icon="fa-regular fa-circle-xmark" />
        </button>
      </div>
      <div class="modal_body">
        <div>
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

const props = defineProps({
  title: String,
  maxWidth: {
    type: Number,
    default: 500,
  },
  fullWidth: {
    type: Boolean,
    default: false,
  },
  fullHeight: {
    type: Boolean,
    default: false,
  }
});
</script>
<style lang="scss">
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.5);
  }

  .modal {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    z-index: 1300;
    width: 60%;
    max-width: 500px;
    width: 75%;
    max-width: 500px;
    background-color: rgb(255, 255, 255);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 5px;
    padding: 10px 20px;

    &.full-height {
      height: 100vh;
      max-height: 100vh !important;
    }

    &.full-width {
      width: 100vw;
      max-width: 100vw !important;
    }
  }

  .modal_header {
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
  }

  .modal_title {
    font-weight: bold;
  }

  .modal_body {
    padding-right: 20px;
    overflow: auto;
  }

  .modal_close {
    font-size: 1.5rem;
    color: rgba(0, 0, 0, 0.3);
  }

  .modal_close svg {
    display: block;
  }

  .modal_close:hover {
    color: rgba(0, 0, 0, 0.5);
  }
</style>
