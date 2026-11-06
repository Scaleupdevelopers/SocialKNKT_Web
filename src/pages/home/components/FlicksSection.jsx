export function FlicksSection({ images }) {
  return (
    <section className="flicks-section">
      <div className="section-heading">
        <h2>Flicks</h2>
        <button type="button">See All</button>
      </div>

      <div className="flicks-grid">
        {images.map((image, index) => (
          <button className="flick-card" type="button" key={image}>
            <img src={image} alt={`Restaurant flick ${index + 1}`} />
            <span>Flick {index + 1}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
