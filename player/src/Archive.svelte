<script>

  import { onMount } from 'svelte';

  //export let visible;
  //export let items = [];
  //export let setItemModal;
  export let projectId;
  export let playerId;
  export let handleHtmlClicks;
  
  let icons = {
    "location": "marker.png",
    "document": "doc_icon.png"
  }

  let page;

  onMount(async ()=>{
    let res = await fetch("/api/page/listWithVars?project=" + projectId + "&player=" + playerId + "&key=archive")
    let pages = await res.json();
    page = pages.docs[0]
    //console.log(page)
  })
    
</script>

<!--div id="container" style="visibility: {visible ? 'visible' : 'hidden'}">     
    {#each items as item}
      <div class="item" on:click={()=>setItemModal(item)}>
        <img src={icons[item.type]} alt="item icon"/>
        <span>{item.key}</span>
      </div>
    {/each}
</div-->

<div id="container" class="archive-page" on:click|stopPropagation={(e)=>handleHtmlClicks(e, "archive")}>{#if page}{@html page.contentWithVars}{/if}</div>


<style type="text/scss">

  #container {
    width: 100%; 
    height: calc(100% - 70px);
    position: absolute;
    left: 0;
    top: 70px;
    background-color: var(--color-bright);
    box-sizing: border-box;
    overflow-y: auto;
  }

  :global .archive-page {

    image-rendering: pixelated;
    hyphens: auto;
    //word-break: break-all;

    *, button {
      font-family: "EurostyleLTStd", sans-serif;
    }

    .bgimg_64 {
      width: 64px;
      height: 64px;    
      background-repeat: no-repeat;
      background: transparent;
    }

    .bgimg_280 {
      width: 280px;
      height: 280px;    
      background-repeat: no-repeat;
      background: transparent;
    }    

    .headline,
    .boat-name {
      text-transform: uppercase;
      font-size: 18px;
      line-height: 22px;    
    }

    .headline {
      font-weight: bold;
      letter-spacing: var(--letter-spacing-bold);
    }

    button.island {
      background-color: var(--color-bright);
    }

    > * {
      margin-bottom: 24px;
      border: 0px solid black;
      border-bottom-width: 1px;
    }

    .player {
      padding: 0 24px 24px 24px;
      &:empty {
        display: none;
      }
    }
    .boat {
      padding: 24px 24px 24px 24px;
      height: 300px;
      width: 100%;
      box-sizing: border-box;
      background: url("/assets/insel_dither_farbig.png") 0% 0% repeat;      
      background-repeat: no-repeat;
      background-position: 90% 90%;
      //background-size: 280 280;
      position: relative;

      .bgimg {
        position:absolute;
        z-index: 0;
        right: 12px;
        bottom: 6px;
      }

      .island {
        position: absolute;
        bottom: 24px;
      }

      .boat-modal {
        position: absolute;
        bottom: 24px;
        right: 24px;
      }

    }

    .goods {
      padding: 0 24px 24px 24px;
      position: relative;

      .headline {
        margin-bottom: 18px;
      }

      .gauge {
        position: absolute;
        top:0;
        right:12px;
      }

      ul {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        li {
          width: 66px;
          margin-right: 12px;
          box-sizing: border-box;
          button {
            
            width: 100%;      
            padding: 0 0 6px 0; 
            background: transparent;
            border-radius: 0;
            border: none;
            cursor: pointer;
            position: relative;
            display: block;

            font-weight: 300;
            font-size: 15px;
            line-height: 16px;

            .bgimg {
              display: block;
              border: 1px solid black;
              margin-bottom: 6px;
            }

            .number {
              display: block;
              position: absolute;
              right: 1px;
              top: 1px;
              padding: 4px;
              background-color: var(--color-blue);
              box-sizing: border-box;
              border: 0px solid black;
              border-width: 0 0 1px 1px;
            }

          }
        }
      }
    }

    .fools {
      padding: 0 24px 24px 24px;
      position: relative;

      .headline {
        margin-bottom: 18px;
      }

      .gauge {
        position: absolute;
        top:0;
        right:12px;
      }

      ul {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        li {
          width: 104px;
          margin-right: 12px;
          box-sizing: border-box;
          button {
            
            width: 100%;      
            padding: 0 0 6px 0; 
            margin: 0;
            background: transparent;
            border-radius: 0;
            border: none;
            cursor: pointer;
            position: relative;
            display: block;

            font-weight: 300;
            font-size: 15px;
            line-height: 16px;

            img {
              image-rendering: initial;
              display: block;
              width: 78px;
              height: 103px;
              object-fit: contain;
              padding: 6px 12px;
              box-sizing: content-box;
              border: 1px solid black;
              margin-bottom: 6px;
            }

            .number {
              display: block;
              position: absolute;
              right: 1px;
              top: 1px;
              padding: 4px;
              background-color: var(--color-blue);
              box-sizing: border-box;
              border: 0px solid black;
              border-width: 0 0 1px 1px;
            }

          }
        }
      }
    }

    .audios {
      padding: 0 24px 24px 24px;
      position: relative;
      .headline {
        margin-bottom: 18px;
      }

      ul {
        overflow: hidden;
      }

      li {
        float: left;
        margin: 0 12px 12px 0;
      }
      button {    
        border-radius: 6px 0;
        width: 100px;
        height: 80px;
        overflow: hidden;
        display: block;
        padding: 6px;
        font-weight: 300;
        color: var(--color-bright);
        background-color: var(--color-dark);            
        border-bottom: 2px var(--color-bright) dotted;
      }
    }

  }

</style>
