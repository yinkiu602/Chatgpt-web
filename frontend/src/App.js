import {ReactComponent as Logo} from './chatgpt.svg';
import {ReactComponent as Arrow} from './arrow.svg';
import './App.css';
import React, {useState, useEffect} from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { darcula } from 'react-syntax-highlighter/dist/esm/styles/prism';

/* eslint-disable no-useless-escape */
const FormatResponse = ({ input_text }) => {
  if (!input_text) return null;

  const lines = input_text.split("\n");
  const codeBlockPattern = /^\s*```(.*)$/;
  const unorderListPattern = /^[\-*]\s+(.*)$/;
  const orderListPattern = /^\d\.\s+(.*)$/;
  let formattedElements = [];
  let listItems = [];
  let nomralItems = [];
  let codeLines = [];
  let lastMatched = [];
  
  const flushNormalItems = () => {
    if (nomralItems.length) {
      if (nomralItems[0].trim() === "") { nomralItems.shift(); }
      if (nomralItems.length === 0) { return; }
      nomralItems[0] = nomralItems[0].trimStart();
      formattedElements.push(
        <MathJax key={formattedElements.length}>
          {nomralItems.join("\n")}
        </MathJax>
      );
      nomralItems = [];
    }
  }

  const flushCodeItems = () => {
    flushNormalItems();
    if (codeLines.length) {
      lastMatched.pop();
      const tempResult = codeBlockPattern.exec(codeLines[0]);
      const language = tempResult ? tempResult[1] : "";
      const new_block = (
        <SyntaxHighlighter key={formattedElements.length} language={language} style={darcula} customStyle={{fontSize: "small", marginLeft: "auto", marginRight: "auto"}} wrapLongLines={true} >
          {codeLines.slice(1, codeLines.length-1).join("\n")}
        </SyntaxHighlighter>
      );
      if (lastMatched.length && (lastMatched[lastMatched.length - 1] === "ul" || lastMatched[lastMatched.length - 1] === "ol")) {
        listItems[listItems.length - 1] = (<>{listItems[listItems.length - 1]}{new_block}</>);
      }
      else {
        formattedElements.push(new_block);
      }
      codeLines = [];
    }
  }

  const flushListItems = () => {
    flushNormalItems();
    if (listItems.length) {
      if (lastMatched[lastMatched.length - 1] === "ul") {
        formattedElements.push(
          <ul key={formattedElements.length}>
            {listItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        );
      }
      else if (lastMatched[lastMatched.length - 1] === "ol") {
        formattedElements.push(
          <ol key={formattedElements.length}>
            {listItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ol>
        );
      }
      listItems = [];
      lastMatched.pop();
    }
  }

  lines.forEach((line, index) => {
    // If code block start is already found
    if (lastMatched[lastMatched.length - 1] === "code") {
      // If code block end found
      if (codeBlockPattern.test(line.trim())) {
        codeLines.push(line);
        flushCodeItems();
      }
      else {
        codeLines.push(line);
      }
      return;
    }
    // If start of code block found
    if (codeBlockPattern.test(line.trim())) {
      lastMatched.push("code");
      codeLines.push(line);
    }
    else if (unorderListPattern.test(line.trim())) {
      if (lastMatched[lastMatched.length - 1] !== "ul") {
        lastMatched.push("ul");
      }
      listItems.push(line.trim().replace(/^[\-*]\s+/, ""));
    }
    else if (orderListPattern.test(line.trim())) {
      if (lastMatched[lastMatched.length - 1] !== "ol") {
        lastMatched.push("ol");
      }
      listItems.push(line.trim().replace(/^\d\.\s+/, ""));
    }
    else {
      if (lastMatched.length) { flushListItems(); }
      nomralItems.push(line);
    }
  })
  flushListItems();
  flushNormalItems();
  return formattedElements;
}

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

const BottomBar = ({message, setMessage}) => {
  const [question, setQuestion] = useState("");

  useEffect(() => {
    let chatbox = document.getElementById("chatbox");
    chatbox.style.height = "0px";
    let padding_top = parseInt(window.getComputedStyle(chatbox, null).paddingTop);
    let padding_bottom = parseInt(window.getComputedStyle(chatbox, null).paddingBottom);
    let content_row = ~~((chatbox.scrollHeight - padding_top - padding_bottom) / parseInt(window.getComputedStyle(chatbox, null).lineHeight));
    let new_row;
    if (content_row < 4) {
      new_row = content_row;
      chatbox.style.scrollbarWidth = "none";
    }
    else {
      new_row = 4;
      chatbox.style.scrollbarWidth = "auto";
    }
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
          <button type="submit" id="submit_but"><Arrow></Arrow></button>
      </form>
    </div>
  );
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
              <div key={index} className={"flex flex_col chat_content fit_content" + (item.role === "user" ? " user_chat": "") }>
                {FormatResponse({input_text: item.content})}                
              </div>
            )
          })}
        </div>
      </div>
      <BottomBar message={message} setMessage={setMessage}/>
    </div>
  )
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
