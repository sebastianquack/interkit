<script>

  const QRCode = require('easyqrcodejs');

  import { onMount, afterUpdate } from 'svelte';

  export let item;

  export let registerAudioPlayer;
  export let onAudioEnded;

  let time, duration, paused = true;

  let audioPlayer;
  let audioIndex;

  const levels = [
    2,4,5,2,5,4,3,1,1,3,5,4,2,3,5,4,5,1,1,5
  ]

  const levelHeights = levels.map(level => level*(20/5)+10)

  onMount(()=>{
    if(registerAudioPlayer)
      audioIndex = registerAudioPlayer(audioPlayer)
  })


	function handleMousedown(e) {
		// we can't rely on the built-in click event, because it fires
		// after a drag — we have to listen for clicks ourselves

		function handleMouseup() {
			if (paused) audioPlayer.play();
			else audioPlayer.pause();
			cancel();
		}

		function cancel() {
			e.target.removeEventListener('mouseup', handleMouseup);
		}

		e.target.addEventListener('mouseup', handleMouseup);

		setTimeout(cancel, 200);
  }
  
  function format(seconds) {
		if (isNaN(seconds)) return '...';

		const minutes = Math.floor(seconds / 60);
		seconds = Math.floor(seconds % 60);
		if (seconds < 10) seconds = '0' + seconds;

		return `${minutes}:${seconds}`;
	}  

    
</script>

<div class="audioplayer">

    <audio 
      bind:this={audioPlayer}  
      bind:currentTime={time}
      bind:duration
      bind:paused      
      on:ended={()=>{
        if(!item.params.stopAfterEnded)
          onAudioEnded(audioIndex)
      }} 
      autoplay={item.params.autoplay ? !item.loaded : false}
    >
    <source src={item.attachment.audioSrc} type="audio/mp3">
  </audio> 

  <button class="button {paused ? "paused" : "playing"}" on:mousedown={handleMousedown}></button>

  <svg class="indicator" width="120" height="30">
    {#each levelHeights as height, i}
      <rect x={i*6} y={30-height} width="4" height={height} />
    {/each}
  </svg>

  <span class="times">
    <time>{format(time)}</time> / <time>{format(duration)}min</time>
  </span>


</div>

<style type="text/scss">

  .audioplayer {
    display: grid;
    grid-template-columns: auto auto;
    grid-template-rows: auto auto;
    column-gap: 12px;
    row-gap: 12px;
  }

  .button {
    grid-column: 1;
    grid-row: 1 / span 2;
    align-self: center;
    width: 32px;
    height: 32px;
    background-color: transparent;
    background-image: url("/assets/icons/Pause.svg");
    background-repeat: no-repeat;
    border: none; margin: 0; padding: 0;
    cursor: pointer;
    &.paused {
      background-image: url("/assets/icons/Play.svg");
    }
  }

  .indicator {
    grid-column: 2;
    grid-row: 1;    
    fill: var(--color-orange);
  }

  .times {
    grid-column: 2;
    grid-row: 2;    
    justify-self: center;
    font-style: italic;
    font-size: 12px;
    line-height: 21px;    
  }

</style>