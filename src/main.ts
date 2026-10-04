import { mount } from 'svelte'
import './styles/retro.css'
import App from './App.svelte'
import { boot } from './lib/boot'

boot()
mount(App, { target: document.getElementById('app')! })
