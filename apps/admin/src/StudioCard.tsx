export function StudioCard({title,subtitle,meta,images,action,open}:{title:string;subtitle:string;meta:string;images?:string[];action:string;open:()=>void}){
 return <article className="studio-card">{!!images?.length&&<div className="contact-covers">{images.map((id,i)=><img key={id+i} src={"/api/art/"+id} alt=""/>)}</div>}<div className="studio-card-copy"><small>{meta}</small><h3>{title}</h3>{subtitle&&<p>{subtitle}</p>}<button onClick={open}>{action}</button></div></article>
}
