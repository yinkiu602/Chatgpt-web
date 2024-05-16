import {ReactComponent as Logo} from './chatgpt.svg';
import {ReactComponent as Arrow} from './arrow.svg';
import './App.css';
import React, {useState, useEffect} from "react";
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

  useEffect(() => {
    let chatbox = document.getElementById("main_content");
    chatbox.scrollTop = chatbox.scrollHeight;
  }, [message]);

  return (
    <div className="Main_Content flex flex_col full_height full_width">
      <div className="">
        Display test
      </div>
      <div className="full_height full_width" id="main_content" style={{overflowY:"auto"}}>
        Content
        <div style={{maxWidth: "48rem"}} className="margin_auto">
          {message.map((item, index) => {
            return (
              <div key={index} className={"flex chat_content fit_content" + (item.role === "user" ? " user_chat": "") }>
                <MathJax>{item.content}</MathJax>
              </div>
            )
          })}

        </div>
      </div>
      <BottomBar message={message} setMessage={setMessage}/>
    </div>
  )
}

const BottomBar = ({message, setMessage}) => {
  const [question, setQuestion] = useState("");

  useEffect(() => {
    let chatbox = document.getElementById("chatbox");
    chatbox.style.height = "0px";
    let padding_top = parseInt(window.getComputedStyle(chatbox, null).paddingTop);
    let padding_bottom = parseInt(window.getComputedStyle(chatbox, null).paddingBottom);
    let content_row = ~~((chatbox.scrollHeight - padding_top - padding_bottom) / parseInt(window.getComputedStyle(chatbox, null).lineHeight));
    let new_row = content_row < 4 ? content_row : 4;
    let new_height = new_row * parseInt(window.getComputedStyle(chatbox).lineHeight) +"px";
    chatbox.style.height = new_height;
  }, [question]);

  async function submit(e) {
    if (e.type === "keydown" && !(e.key === "Enter" && !e.shiftKey)) { return; }
    e.preventDefault();
    if (question === "") { return; }
    let res_text = "";
    let user_question = question;
    let old_message = message.concat([{role: "user", content: user_question}]);
    setMessage(old_message);
    setQuestion("");
    let res = await fetch("http://127.0.0.1:8080/api/request", {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: old_message,
      })
    })
    for await (const chunk of res.body) {
      let partial = await new Response(chunk).text();
      res_text += partial;
      const new_message = old_message.concat([{role: "assistant", content: res_text}]);
      setMessage(new_message);
    }
  }

  return (
    <div className="flex flex_col">
      <form onSubmit={submit} className="submit_form flex">
          <textarea className="full_width chatbox" id="chatbox" name="chatbox" placeholder="Message ChatGPT" rows={1} onKeyDown={submit} onChange={(event => setQuestion(event.target.value))} value={question}/>
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
