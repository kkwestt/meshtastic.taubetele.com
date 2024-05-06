<template>
  <div class="modal-overlay">
    <div class="modal">
      <div class="modal_wrapper">
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
  </div>
</template>
<script setup>
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

  defineProps({
    title: String,
  })
</script>
<style>
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
    max-height: 60vh;
    width: 60%;
    max-width: 500px;
    background-color: rgb(255, 255, 255);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 5px;
    display: flex;
    flex-direction: column;
    padding: 10px 0 20px 20px;
  }

  .modal_header {
    padding-right: 40px;
    margin-bottom: 10px;
    position: relative;
  }

  .modal_title {
    font-weight: bold;
  }

  .modal_body {
    padding-right: 20px;
  }

  .modal_close {
    font-size: 1.5rem;
    color: rgba(0, 0, 0, 0.3);
    position: fixed;
    top: 10px;
    right: 10px;
  }

  .modal_close svg {
    display: block;
  }

  .modal_close:hover {
    color: rgba(0, 0, 0, 0.5);
  }

  .modal_wrapper {
    overflow: scroll;
  }
</style>