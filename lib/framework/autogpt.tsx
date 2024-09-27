// pages/groq.tsx

import { GetServerSideProps, NextPage } from 'next';
import React from 'react';

// Define the shape of the data you expect from the Groq API
interface Document {
    _id: string;
    _type: string;
    title: string;
    // Add other fields as necessary
}

interface GroqResponse {
    result: Document[];
}

interface GroqPageProps {
    data: Document[] | null;
    error: string | null;
}

const GroqPage: NextPage<GroqPageProps> = ({ data, error }) => {
    if (error) {
        return (
            <div style={styles.container}>
                <h1>Groq API Data</h1>
                <p style={styles.error}>Error: {error}</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div style={styles.container}>
                <h1>Groq API Data</h1>
                <p>No data found.</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1>Groq API Data</h1>
            <ul style={styles.list}>
                {data.map((doc) => (
                    <li key={doc._id} style={styles.listItem}>
                        <h2>{doc.title}</h2>
                        {/* Render other fields as needed */}
                    </li>
                ))}
            </ul>
        </div>
    );
};

// Define your Groq query
const groqQuery = `*[_type == "post"]{
  _id,
  _type,
  title,
  // Add other fields you need
}`;

export const getServerSideProps: GetServerSideProps<GroqPageProps> = async () => {
    const projectId = process.env.GROQ_PROJECT_ID || '';
    const dataset = process.env.GROQ_DATASET || 'production';
    const apiVersion = process.env.GROQ_API_VERSION || 'v2023-06-07';
    const token = process.env.GROQ_TOKEN;

    if (!projectId) {
        return {
            props: {
                data: null,
                error: 'GROQ_PROJECT_ID is not defined in environment variables.',
            },
        };
    }

    const url = `https://${projectId}.api.sanity.io/${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(
        groqQuery
    )}`;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, { headers });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error fetching data: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const json: GroqResponse = await response.json();
        return {
            props: {
                data: json.result,
                error: null,
            },
        };
    } catch (err: any) {
        return {
            props: {
                data: null,
                error: err.message || 'Unknown error',
            },
        };
    }
};

// Basic inline styles for simplicity
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        maxWidth: '800px',
        margin: '0 auto',
        padding: '2rem',
        fontFamily: 'Arial, sans-serif',
    },
    list: {
        listStyleType: 'none',
        padding: 0,
    },
    listItem: {
        borderBottom: '1px solid #ccc',
        padding: '1rem 0',
    },
    error: {
        color: 'red',
    },
};

export default GroqPage;
