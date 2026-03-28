export default function RadarPanel({ persons = [] }) {
  return (
    <div className="radar-container">

      <div className="radar-circle"></div>
      <div className="radar-sweep"></div>

      {persons.map((p, i) => (
        <div
          key={i}
          className="radar-dot"
          style={{
            top: `${20 + i * 30}px`,
            left: `${50 + i * 40}px`
          }}
        />
      ))}

    </div>
  );
}