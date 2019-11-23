import React from 'react'
import ReactDOM from 'react-dom'
import GraphiQL from 'graphiql'
import 'graphiql/graphiql.css'
// import fetch from 'isomorphic-fetch';

function graphQLFetcher(graphQLParams) {
  return fetch('http://localhost:8000/subgraphs/name/wild-cards/subgraph', {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(graphQLParams),
  }).then(response => response.json())
}

ReactDOM.render(<GraphiQL fetcher={graphQLFetcher} />, document.getElementById('root'))
