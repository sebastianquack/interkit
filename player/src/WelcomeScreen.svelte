<script>
  import { onMount } from 'svelte';

  import { isIOS } from 'mobile-device-detect';
  //let isIOS = true

  export let setBypassWelcome;

  let visible = true
  let counter = 1

  const images = [
    "Yacht_412px_post.png",
    "Luftmatratze_412px_post.png",
    "Katamaran_412px_post.png",
    "Jolle_412px_post.png",
    "Frachter_412px_post.png",
    "Floss_412px_post.png",
    "Fischerboot_412px_post.png",
  ]

  const randomImage = images[Math.floor(Math.random()*images.length)];

  setTimeout(function(){
    if (!isIOS) next();
  },8000)

  let interval = setInterval(() => {
    counter++
    if (counter > 4) clearInterval(interval)
  },2000)

  function next() {
    setBypassWelcome(true)
  }

</script>

<div class="container" style={`background-image: url(/assets/boats/${randomImage})`}>
  <div class="header">
    <h1>Willkommen bei<br/><b>Botboot</b></h1>
  </div>
  <div class="content">
    <div class="author">
      Botboot
    </div>

    <div class="bubble">
      Hey, Lust auf Gesellschaft?
    </div>

    {#if isIOS }
      {#if counter > 1}
        <div class="bubble" style="max-width: 65%">
          Du musst mich auf deinem Homescreen installieren, damit ich funkioniere. <br />
        </div>
      {/if}

      {#if counter > 2}
        <div class="bubble" style="width: 100%;">
          Öffne dieses Menü <br />
          <center>
            <img alt="Safari menu button" style="height: 2em" src="/ios-pwa-step1.png" />
          </center>
        </div>        
      {/if}

      {#if counter > 3}
        <div class="bubble" style="width: 100%;">
          scroll herunter und wähle
          <center>
            <img alt="Add to Home Screen" style="width: 100%" src="/ios-pwa-step2.png" />
          </center>      
        </div>
      {/if}

    {:else}

    <div class="button" on:click={next}>
      Start Botboot
    </div>
    
    {/if}

  </div>
</div>

<style type="text/scss">

  .container {
    background-repeat: no-repeat;
    background-size: cover;
    background-position: 10% 90%;
    width: 100%;
    height: 100%;
    position: fixed;
    top:0;
    box-sizing: border-box;
    padding: 12px 12px 0 12px;
    display: flex;
    flex-direction: column;
  }

  .header {
    display: flex;
    flex: 1;
    justify-content: center;
    align-items: center;

    h1 {
      font-family: EurostyleLTStd;
      text-transform: uppercase;
      font-weight: normal;
      font-size: 18px;
      line-height: 26px;
      letter-spacing: 0.04em;


      b {
        font-family: EurostyleLTStd-Ex2;
        font-weight: bold;
        font-size: 36px;
        line-height: 42px;
        letter-spacing: var(--letter-spacing-bold);
      }
    }
  }

  .content {
    flex: 3;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    justify-items: flex-start;
    align-items: flex-start;

    > * {
      margin-bottom: 12px;
    }

    .author, .button {
      letter-spacing: 2px;
    }

    .author {
      font-size: 12px;
      line-height: 12px;
      font-weight: bold;
      text-transform: uppercase;
      color: var(--color-orange);
      margin-left: 12px;
    }

    .bubble, .button {
      background-color: var(--color-bright);
      border-radius: var(--bubble-border-radius);
      padding: 12px;
      border: 1px solid var(--color-dark);
      
    }

    .bubble {
      display: inline;
      box-sizing: border-box;
      animation-name: appear;
      animation-duration: 1s;
      animation-iteration-count: 1;
      animation-fill-mode: forwards;
    }

    .button {
      background-color: var(--color-dark);
      color: var(--color-bright);
      border-color: var(--color-bright);
      align-self: center;
      margin: 50px 0 62px 0;
      font-size: 15px;
      line-height: 16px;
      font-weight: bold;
      text-transform: uppercase;
      &:hover, &:active {
        background-color: var(--color-bright);
        color: var(--color-dark);
        cursor: pointer;
        user-select: none;
      }
    }

  }

  @keyframes appear {
    from   {opacity: 0; }
    to     {opacity: 1;}
  }

</style>