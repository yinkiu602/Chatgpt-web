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
  const [message, setMessage] = useState([]);
  return (
    <div className="Main_Content flex flex_col full_height">
      <div className="">
        Display test
      </div>
      <div className='full_height full_width' style={{overflowY:"auto"}}>
        Content
        {message.map((item, index) => {
          return (
            <div key={index} className="flex">
              <MathJax>{item}</MathJax>
            </div>
          )
        })}
      </div>
      <BottomBar message={message} setMessage={setMessage}/>
    </div>
  )
}

const BottomBar = ({message, setMessage}) => {
  const [question, setQuestion] = useState("");

  function auto_grow(e) {
    setQuestion(e.target.value);
    e.target.style.height = "0px";
    let padding_top = parseInt(window.getComputedStyle(e.target, null).paddingTop);
    let padding_bottom = parseInt(window.getComputedStyle(e.target, null).paddingBottom);
    let content_row = ~~((e.target.scrollHeight - padding_top - padding_bottom) / parseInt(window.getComputedStyle(e.target, null).lineHeight));
    let new_row = content_row < 4 ? content_row : 4;
    let new_height = new_row * parseInt(window.getComputedStyle(e.target).lineHeight) +"px";
    e.target.style.height = new_height;
  }

  async function submit(e) {
    if (e.type === "keydown" && !(e.key === "Enter" && !e.shiftKey)) { return; }
    e.preventDefault();
    if (question === "") { return; }
    let res_text = "";
    let old_message = message;
    let res = await fetch("http://127.0.0.1:8080/api/request", {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: question,
      })
    })
    for await (const chunk of res.body) {
      let partial = await new Response(chunk).text();
      res_text += partial;
      const new_message = old_message.concat([res_text]);
      setMessage(new_message);
    }
    console.log("Submitted");
  }

  return (
    <div className="flex flex_col">
      <form onSubmit={submit} className="submit_form flex">
          <textarea className="full_width chatbox" name="chatbox" placeholder="Message ChatGPT" rows={1} onKeyDown={submit} onChange={(event => auto_grow(event))} value={question}/>
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
