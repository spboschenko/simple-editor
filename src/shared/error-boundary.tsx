import React from 'react'

export class CanvasErrorBoundary extends React.Component<{children?:React.ReactNode},{hasError:boolean}> {
  constructor(props:any){super(props);this.state={hasError:false}}
  static getDerivedStateFromError(){return {hasError:true}}
  componentDidCatch(error:any, info:any){
    console.error('Canvas error', error, info)
  }
  render(){
    if(this.state.hasError){
      return <div className="canvas-fallback">Canvas failed to load. Check console.</div>
    }
    return this.props.children as any
  }
}

export default CanvasErrorBoundary
