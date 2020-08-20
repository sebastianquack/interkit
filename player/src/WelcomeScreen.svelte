<script>
  import { onMount } from 'svelte';

  export let setBypassWelcome;
  export let message;
  export let buttonHidden = false;

  let visible = true
  let counter = 0

  const images = [
    "Yacht_412px_post.png",
    "Luftmatratze_412px_post.png",
    "Katamaran_412px_post.png",
    "Jolle_412px_post.png",
    "Frachter_412px_post.png",
    "Floss_412px_post.png",
    "Fischerboot_412px_post.png",
  ]

  window.randomImage = window.randomImage || images[Math.floor(Math.random()*images.length)];

  //setTimeout(function(){
  //  next();
  //},8000)

  function next() {
    setBypassWelcome(true)
  }

</script>

<div class="container" style={`background-image: url(/assets/boats/${window.randomImage})`}>

  <div class="header">
    <h1>Willkommen bei<br/><b>Botboot</b>
    <br />
    <img class="logo" src="/assets/itc_powered.png" alt="powered by Imagine The City"/>
    </h1>

  </div>

  <div class="content" style="visibility: { buttonHidden ? "hidden" : "visible"}">

    <div class="author">
      Botboot
    </div>

    <div class="bubble">
      Lust auf Gesellschaft?
    </div>

    <div class="button" on:click={next}>
      Starte Botboot
    </div>    


  </div>

  <aside class="message">{message}</aside>
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

  .message {
    opacity: 0.7;
    position: fixed;
    bottom: 12px;
    font-size: 12px;
    line-height: 12px;
    text-align: center;
    box-sizing: border-box;
    width: 100%;
    color: white;
  }

  .header {
    display: flex;
    flex: 1;
    justify-content: flex-end;
    align-items: center;
    flex-direction: column;
    padding-top: 12px;
    padding-left: 4px;
    overflow: hidden;

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

    .logo {
      filter: invert(1);
      width: auto;
      height: 100px;
      object-fit: contain;
      opacity: 1;
      position: relative;
      margin-top: 0px;
      ;
    }

  .content {
    flex: 2;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    justify-items: flex-start;
    align-items: flex-start;
    overflow: hidden;

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
    }

    .bubble, .author {
       animation-name: appear;
       animation-duration: 1s;
       animation-delay: 2s;
       animation-iteration-count: 1;
       animation-fill-mode: both;
       animation-timing-function: ease-out;
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
      //animation-name: appear;
      //animation-duration: 1s;
      //animation-delay: 1.5s;
      //animation-iteration-count: 1;
      //animation-fill-mode: both;      
      user-select: none;      
      &:hover, &:active {
        background-color: var(--color-bright);
        color: var(--color-dark);
        cursor: pointer;
      }
    }

  }

  @keyframes appear {
    0%   {transform: translateY(100%); opacity: 0; }
    100%     {transform: translateY(0%); opacity: 1;}

  }

</style>