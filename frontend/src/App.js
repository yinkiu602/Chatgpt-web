import {ReactComponent as Logo} from './chatgpt.svg';
import {ReactComponent as Arrow} from './arrow.svg';
import './App.css';
import React, {useState} from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";

const LeftBar = () => {
  const [login, setLogin] = useState(false);
  return (
    <div className="full_height flex flex_col Left_Menu">
      <div>
        <a href={window.location.origin} style={{display:'flex', height:"2.5rem"}}>
          <div>
            <div>
              <Logo className="w2/3 h2/3"/>
            </div>
          </div>
          New Chat
        </a>
      </div>
      <div className="hundred full_width">
        Chat Content here
      </div>
      <div className="flex_col flex">
        <button>Log in</button>
      </div>
    </div>
    
  )
}

const MainContent = () => {
  return (
    <div className="Main_Content flex flex_col full_height">
      <div className="">
        Display test
      </div>
      <div className='full_height full_width' style={{overflowY:"auto"}}>
        Content
      </div>
      <BottomBar/>
    </div>
  )
}

const BottomBar = () => {
  const [message, setMessage] = useState("");
  function auto_grow(e) {
    setMessage(e.target.value);
    e.target.style.height = "0px";
    let padding_top = parseInt(window.getComputedStyle(e.target, null).paddingTop);
    let padding_bottom = parseInt(window.getComputedStyle(e.target, null).paddingBottom);
    let content_row = ~~((e.target.scrollHeight - padding_top - padding_bottom) / parseInt(window.getComputedStyle(e.target, null).lineHeight));
    let new_row = content_row < 4 ? content_row : 4;
    let new_height = new_row * parseInt(window.getComputedStyle(e.target).lineHeight) +"px";
    e.target.style.height = new_height;
  }

  function handle_keydown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    console.log("Submitted");
  }
  return (
    <div className="flex flex_col">
      <form onSubmit={submit} className="submit_form flex">
          <textarea className="full_width chatbox" name="chatbox" placeholder="Message ChatGPT" rows={1} onKeyDown={event => handle_keydown(event)} onChange={(event => auto_grow(event))} value={message}/>
          <button type="submit"><Arrow></Arrow></button>
      </form>
    </div>
  );
}



function App() {
  return (
    <MathJaxContext>
    <div className="App full_height" style={{display:"flex"}}>
      <LeftBar />
      <MainContent/>
    </div>
    </MathJaxContext>
  );
}

export default App;
